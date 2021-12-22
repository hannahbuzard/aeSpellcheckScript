	/**
	 * Create the main dialog, check spelling button, scrollbar, and 'ok'/'cancel' buttons. All should be visible
	 */
	var dropdownObjects = [];
	var replaceButton;
	var complabels = [];
	var window = new Window("palette", "AE Spellcheck");
	window.alignChildren = "right";
	var checkSpelling = window.add("button" , [0,0,296,30] , "Check Spelling");
	var mainGroup = window.add("group");
	mainGroup.orientation = "row";
	var panel = mainGroup.add("panel");
	var scrollBar = mainGroup.add("scrollbar",  [380,25,400,460]);
	scrollBar.stepdelta = 10;
	panel.orientation = "column";
	panel.alignment = "fill";
	panel.alignChildren = "right";
	panel.margins.top = 10;
	panel.maximumSize.height = 350;
	scrollBar.maximumSize.height = panel.maximumSize.height;
	var replaceGroup;
	//Create group where mispelled words and their suggested replacements will be loaded (on button click)
	checkSpelling.onClick = function () {
		replaceGroup = panel.add("group");
		replaceGroup.orientation = "column";
		replaceGroup.alignChildren = "right";
		var ggGroup = replaceGroup.add("group");
		ggGroup.alignChildren = "top";
		ggGroup.add("statictext", [0,00,150,20], "Replace Misspelled Words");
		//Get the names of all comps in project to add to the filter option
		var compsInProject = getComps( getAEProject() );
		var filterLabels = ["All Comps"];
		for(var i = 0; i < compsInProject.length; i++) {
			filterLabels.push(compsInProject[i].name);
		}
		var filter = ggGroup.add("dropdownlist", [0,0,80,20], filterLabels);
		var allwordsInProj = getAllWords();
		addReplaceOptions(replaceGroup, allwordsInProj);
		//When the filter for displaying comps changes, either display UI for only the selected comp, or all comps if "All Comps" is selected
		filter.onChange = function () {
			if(filter.selection.toString() === "All Comps") {
				displayFilteredComps(replaceGroup, allwordsInProj);
			} else {
				var wordsInComp = getWordsFromOneComp(filter.selection);
				displayFilteredComps(replaceGroup, wordsInComp)
			}
		}
	}
	scrollBar.onChanging = function () {
		replaceGroup.location.y = -1 * this.value;
	}
	window.center();
	window.show();

/**
 * Find misspelled words in all comps, generate list of replacement options. For each word, display
 * word with a dropdown menu of options all within a group.
 */
	function addReplaceOptions(group, textStrings) {
		var currentComp = "";
		for(var i = 0; i< textStrings.length; i++) {
			if(currentComp !== textStrings[i].comp ) {
				var complabel = group.add("statictext", [50,50,296,80], textStrings[i].comp);
				complabels.push(complabel);
				currentComp = textStrings[i].comp;
			}
			var layer = textStrings[i].layer;
			var wordsInString = textStrings[i].text.toString().split(" ");
			//If a word is misspelled, then display the misspelled word with a dropdown menu of replacement options
			for(var j = 0; j < wordsInString.length; j++) {
				if(!isThisWordSpelledCorrectly(wordsInString[j])) {
					dropdownGroup = group.add("group");
					dropdownGroup.alignChildren = "top";
					dropdownGroup.add("statictext", [0,0,100,20], wordsInString[j]); 
					var dropdown_array = getCandidatesForThisWord(wordsInString[j]);
					dropdownGroup.btns = dropdownGroup.add("group");
					var dropdown = dropdownGroup.btns.add("dropdownlist", [0,0,100,20], dropdown_array); 
					dropdownObjects.push({group: dropdownGroup, dropdown: dropdown, word: wordsInString[j], layer: layer});
				}
			}
		}
		replaceButton = group.add("button" , [50,0,150,30] , "Replace");
		//when Replace button is clicked, replace misspelled words w/ corrections & then clear the UI view for misspelled words
		replaceButton.onClick = function () {
			for(var i =0; i< dropdownObjects.length; i++) {
				if(dropdownObjects[i].dropdown.selection !== null) {
					replaceTextInLayer(dropdownObjects[i].layer, dropdownObjects[i].word, dropdownObjects[i].dropdown.selection);
				}
			}
			panel.remove(group);
			dropdownObjects = [];
		}
		window.layout.layout(true);
	}

/**
 * Remove all currently displayed comps & comp labels from UI view and then
 * re-load & display UI for only the words from the filtered comp (specified via filter dropdown menu)
 */
 function displayFilteredComps(group, words) {
	for(var i =0; i< dropdownObjects.length; i++) {
		group.remove(dropdownObjects[i].group);
	}
	for(var i =0; i< complabels.length; i++) {
		group.remove(complabels[i]);
	}
	complabels = [];
	dropdownObjects = [];
	group.remove(replaceButton);
	addReplaceOptions(group, words);
}

	
/**
 * Returns all strings of editable text from each comp within an AE project
 */
function getAllWords() {
	var openProject = getAEProject();
	var compsInProject = getComps( openProject );
	var textStrings = [];
	for(var i = 0; i < compsInProject.length; i++) {
		var text = getEditableStringsFromComp( compsInProject[i] );
		for(var j = 0; j < text.length; j++) {
			textStrings.push(text[j]);
		}
	}
	return textStrings;
}

/**
 * Returns all strings of editable text from only one comp (specified via the filter dropdown)
 */
 function getWordsFromOneComp(aeCompName) {
	var openProject = getAEProject();
	var textStrings = [];
	var compsInProject = getComps( openProject );
	for(var i = 0; i < compsInProject.length; i++) {
		if(compsInProject[i].name.toString() === aeCompName.toString()) {
			textStrings = getEditableStringsFromComp( compsInProject[i] );
			break;
		}
	}
	return textStrings;
}

//Returns active AE Project
var getAEProject = function () { return app.project };

// Check that a project item is a Composition
var isComp = function ( item ) { return item instanceof CompItem };

/**
 * Get all the Composition objects from an After Effects project
 * @param {Object} aeProject 
 * @returns {Array} An array of Compositions in the Project
 */
var getComps = function ( aeProject ) {
	var allComps = [],
		currentItem;

	for ( var i = aeProject.numItems; i; i-- ) {
		currentItem = aeProject.item( i );

		if ( isComp( currentItem ) ) {
			allComps.push( currentItem );
		}
	}

	// Reverse the array to reflect the order in the Project panel
	return allComps.reverse();
}

/**
 * Get all the layers of a given AE composition
 * @param {CompItem} aeComp An AE Composition
 * @returns {Array} All  layers in the given Composition
 */
var getLayers = function ( aeComp ) {
	var allLayers = [];

	for ( var i = aeComp.numLayers; i; i-- ) {
		allLayers.push( aeComp.layer( i ) );
	}

	// Reverse the array to reflect the order in the Comp
	return allLayers.reverse();
};


/**
 * Given a layer, a string to find, and a string to replace the old string with, this function 
 * finds the searched for string (if it exists) within a layer and replaces it 
 * with the given replace string. 
 * Credit to Sebastian Perier for this method (in find and replace UXP panel for AE)
 */
var replaceTextInLayer = function (theLayer, findString, replaceString) {
	var changedSomething = false;
	// Get the sourceText property, if there is one.
	var sourceText = theLayer.sourceText;
	if (sourceText != null) {
		if (sourceText.numKeys == 0) {
			// textValue is a TextDocument. Retrieve the string inside
			var oldString = sourceText.value.text;
			if (oldString.indexOf(findString) != -1) {
				var newString = replaceTextInString(oldString, findString, replaceString);
				if (oldString != newString) {
					sourceText.setValue(newString);
					changedSomething = true;
				}
			}
		} else {
			// Do it for each keyframe:
			for (var keyIndex = 1; keyIndex <= sourceText.numKeys; keyIndex++) {
				// textValue is a TextDocument. Retrieve the string inside
				var oldString = sourceText.keyValue(keyIndex).text;
				if (oldString.indexOf(findString) != -1) {
					var newString = replaceTextInString(oldString, findString, replaceString);
					if (oldString != newString) {
						sourceText.setValueAtKey(keyIndex,newString);
						changedSomething = true;
					}
				}
			}
		}
	}
	return changedSomething;
}

var replaceTextInString = function (totalString, findString, replaceString) {
	var regularExpression = new RegExp(findString,"g");
	var newString = totalString.replace(regularExpression, replaceString);
	return newString;
}


var isTextLayer = function ( item ) { 
	var instance = item instanceof TextLayer;
	return instance;
};

var isPreComp = function ( item ) { return item.source && isComp( item.source ) };

var hasEssentialProps = function ( item ) { return item.property( "ADBE Layer Overrides" ).numProperties };

var isSourceText = function ( item ) { return item.matchName === "ADBE Text Document" };

/**
 * 
 * @param {Property} sourcePropGroup 
 * @returns {Array} An array of Source Text Property objects
 */
var getSourceTextProps = function ( sourcePropGroup ) {
	var arr = [];

	forAllPropsInGroup( sourcePropGroup, function ( prop ) {
		if ( isPropGroup( prop ) ) {
			arr = arr.concat( getSourceTextProps( prop ) );
		} else if ( isSourceText( prop ) ) {
			arr.push( prop );
		}
	} );

	return arr;
};

var forAllPropsInGroup = function ( propGroup, doSomething ) {
	for ( var i = 1, il = propGroup.numProperties; i <= il; i++ ) {
		var thisProp = propGroup.property( i );
		doSomething( thisProp );
	}
};

var isPropGroup = function ( prop ) {
	return prop.propertyType === PropertyType.INDEXED_GROUP ||
		prop.propertyType === PropertyType.NAMED_GROUP ||
		prop.dimensionsSeparated;
};

/**
 * Filter function for finding layers with editable text
 * @param {AVLayer} aeLayer 
 * @returns {Boolean} true if the layer has editable text
 */
var hasEditableText = function ( aeLayer ) {
	// First, check if this is a Text layer.
	if ( isTextLayer( aeLayer ) ) {
		return true;

	// Next, check if this is Comp with Source Text EPs
	} else if (
		isPreComp( aeLayer ) &&
		hasEssentialProps( aeLayer ) &&
		 // Using .length on line below to check for existence, but this same
		 // getSourceTextProps function could return all Source Text props if needed
		getSourceTextProps( aeLayer.property( "ADBE Layer Overrides" ) ).length
	) {
		return true;
	} else {
		return false;
	}
};

/**
 * Given a CompItem, get all the layers with editable text e.g. Source Text properties
 * @param {CompItem} aeComp 
 * @returns {Array} An array of AVLayers with editable text
 */
var getLayersWithEditableText = function ( aeComp ) {
	return getLayers( aeComp ).filter( hasEditableText );
};

var word = function (layer, text, comp) {
	this.layer = layer;
	this.text = text;
	this.comp = comp;
}

/**
 * Get all editable strings from a Comp
 */
var getEditableStringsFromComp = function ( aeComp ) {
	var layersWithText = getLayersWithEditableText( aeComp );
	var textStrings = [];
	for(var i = 0; i < layersWithText.length; i++ ) {
		if ( isTextLayer( layersWithText[i] ) ) {
			textStrings.push(new word(layersWithText[i], layersWithText[i].text.property("ADBE Text Document").value, aeComp.name));
		}
	}
	return textStrings;
};

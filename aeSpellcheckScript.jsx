	/**
	 * Create the main dialog, check spelling button, scrollbar, and 'ok'/'cancel' buttons. All should be visible
	 */
	var window = new Window("dialog" , "AE Spellcheck");
	window.alignChildren = "right";
	var checkSpelling = window.add("button" , [0,0,296,30] , "Check Spelling for all comps");
	var mainGroup = window.add("group");
	mainGroup.orientation = "row";
	var panel = mainGroup.add("panel");
	var scrollBar = mainGroup.add("scrollbar",  [380,25,400,460]);
	scrollBar.stepdelta = 10;
	panel.orientation = "column";
	panel.alignment = "fill";
	panel.alignChildren = "right";
	panel.margins.top = 10;
	panel.maximumSize.height = 250;
	scrollBar.maximumSize.height = panel.maximumSize.height;
//=========
	var replaceGroup = panel.add("group");
	replaceGroup.orientation = "column";
	replaceGroup.alignChildren = "right";
	replaceGroup.add("statictext", [50,50,296,80], "Replace Misspelled Words");
	checkSpelling.onClick = function () {
		var allwordsInProj = getAllWords();
		addReplaceOptions(panel, replaceGroup,allwordsInProj);
	}
	var panelOptions = window.add("group");
	panelOptions.orientation = "row";
	panelOptions.alignment = "right";
	panelOptions.add("button" , undefined , "OK");
	panelOptions.add("button" , undefined , "Cancel");

	scrollBar.onChanging = function () {
		replaceGroup.location.y = -1 * this.value;
	}
	window.show();

/**
 * Find misspelled words in all comps, generate list of replacement options. For each word, display
 * word with a dropdown menu of options all within a group.
 */
	function addReplaceOptions(panel, group,textStrings) {
		var dropdownObjects = [];
		for(var i = 0; i< textStrings.length; i++) {
			var word = textStrings[i].text;
			var layer = textStrings[i].layer;
				if(!isThisWordSpelledCorrectly(word)) {
					dropdownGroup = group.add("group");
					dropdownGroup.alignChildren = "top";
					dropdownGroup.add("statictext", [0,0,100,20],word); 
					var dropdown_array = getCandidatesForThisWord(word);
					dropdownGroup.btns = dropdownGroup.add("group");
					var dropdown = dropdownGroup.btns.add("dropdownlist", [0,0,100,20], dropdown_array); 
					dropdownObjects.push({group: dropdownGroup, dropdown: dropdown, word: word, layer: layer});
				}
		}
		var replaceButton = group.add("button" , [50,0,150,30] , "Replace");
		replaceButton.onClick = function () {
			for(var i =0; i< dropdownObjects.length; i++) {
				if(dropdownObjects[i].dropdown.selection !== null) {
					replaceTextInLayer(dropdownObjects[i].layer, dropdownObjects[i].word, dropdownObjects[i].dropdown.selection);
				}
			}
			panel.remove(group);
		}
		window.layout.layout(true);
	}

	
/**
 * Returns all strings of editable text from each comp within an AE project
 */
function getAllWords() {
	var openProject = getAEProject();
	var compsInProject = getComps( openProject );
	var textStrings = getEditableStringsFromComp( compsInProject[0] );
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

var word = function (layer, text) {
	this.layer = layer;
	this.text = text;
}

/**
 * Get all editable strings from a Comp
 */
var getEditableStringsFromComp = function ( aeComp ) {
	var layersWithText = getLayersWithEditableText( aeComp );
	var textStrings = [];
	for(var i = 0; i < layersWithText.length; i++ ) {
		if ( isTextLayer( layersWithText[i] ) ) {
			textStrings.push(new word(layersWithText[i], layersWithText[i].text.property("ADBE Text Document").value));
		}
	}
	return textStrings;
};

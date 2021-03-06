/* vim: set expandtab sw=4 ts=4: */
/**
 * Button Class.
 *
 * Copyright (C) 2014-2016 Dieter Adriaenssens <ruleant@users.sourceforge.net>
 *
 * This file is part of buildtimetrend/dashboard
 * <https://github.com/buildtimetrend/dashboard/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var CLASS_BUTTON_NORMAL = 'btn btn-primary';
var CLASS_BUTTON_ACTIVE = 'btn btn-success';

/**
 * Selection button class.
 *
 * This class makes a group of Bootstrap buttons interactive :
 *  - all buttons are colourcoded : the active button is formated with
 *    CLASS_BUTTON_ACTIVE (default : 'btn btn-success'),
 *    the others are formatted with CLASS_BUTTON_NORMAL (default: 'btn btn-primary')
 *  - the default button can be set with a url parameter
 *  - on initialisation, the default button is activated,
 *    and a custom caption is applied (see `caption`)
 *  - when another button is clicked, that button becomes the active button
 *    and the formatting of all the buttons is updated accordingly.
 *  - `ButtonClass.currentButton` holds the current active button value
 *  - a custom click event can be attached to each button seperately (see `onClick`),
 *    or an event that applies for all buttons.
 *
 * Usage:
 *
 * - Create the html :
 *
 * <div class='btn-group-xs'>
 *   <button type='button' id='prefix_button1' class='btn btn-default'>Button1</button>
 *   <button type='button' id='prefix_button2' class='btn btn-default'>Button2</button>
 * </div>
 *
 * - Create a class instance :
 *
 * var buttons = new ButtonClass(
 *   'buttons' // Class instance name, used as prefix or to set value using a url parameter
 *   {
 *     'button1': {
 *        'caption': 'First Button',
 *        'onClick': function() { someAction(); }, // optional
 *        'customParam' : 'custom_value' // custom parameter (optional)
 *     },
 *     'button2': {
 *       'caption': 'Second Button',
 *       'onClick': function() { otherAction(); }  // optional
 *     }
 *   },
 *   DEFAULT_BUTTON, // should match one of the buttons in the list,
 *                   // otherwise the first one is used.
 *   'prefix_' // prefix used for all buttons in the HTML button id, if not defined,
 *             // class name is used as prefix
 * );
 *
 * - Initialise the buttons :
 *
 * buttons.initButtons();
 *
 * - set the button using a url parameter :
 *
 * Use the buttonclass instance name as a url parameter and assign a button name as value :
 * fe. index.html?buttons=button2
 *
 * - The currently active button name is stored in :
 *
 * buttons.currentButton;
 * 
 * - Get the currently active button parameters,
 * this returns a key-value paired list of parameters associated with the active button :
 *
 * activeButton = buttons.getCurrentButton();
 * 
 * If `activeButton` is `button1`, the result would be :
 * 
 * {
 *      'caption': 'First Button',
 *      'onClick': function() { someAction(); },
 *      'customParam' : 'custom_value'
 * }
 *
 * This corresponds to the parameters that are added when creating the class.
 * Other key-value pairs (like `custom_param` in this example) can be added
 * when creating the instance class.
 * 
 * - Define a custom onClick event that is executed when any button is clicked:
 *
 * buttons.onclick = function() { anyAction(); };
 *
 * Remark : if an onClick event is defined for a specific button, that action is
 * executed after the general onClick event is executed.
 */
function ButtonClass(name, buttonList, defaultButton, buttonPrefix) {
    this.name = isEmpty(name) ? '' : name;
    this.buttonList = isEmpty(buttonList) ? {
        'button1': {},
        'button2': {}
    } : buttonList;
    this.buttonPrefix = isEmpty(buttonPrefix) ? this.name + '_' : buttonPrefix;
    this.onClick = '';

    // Set default button
    this.setDefaultButton = function (button) {
        var buttonNames = Object.keys(this.buttonList);
        if (buttonNames.length > 0) {
            // check if button is defined or exists in list of buttons
            if (!isEmpty(button) && (button in this.buttonList)) {
                this.defaultButton = button;
            } else {
                this.defaultButton = buttonNames[0];
            }
        } else {
            this.defaultButton = '';
        }

        return this.defaultButton;
    };
    this.defaultButton = this.setDefaultButton(defaultButton);
    this.currentButton = this.defaultButton;

    // Set current button
    this.setCurrentButton = function (button) {
        // check if button is defined and exists in list of buttons
        if (!isEmpty(button) && (button in this.buttonList)) {
            this.currentButton = button;
        }

        // use default button, if button is not defined
        if (isEmpty(this.currentButton) || !(button in this.buttonList)) {
            this.currentButton = this.defaultButton;
        }
    };
    // Get current button
    this.getCurrentButton = function () {
        var buttonData = this.buttonList[this.currentButton];
        buttonData.name = this.currentButton;
        return buttonData;
    };
    // Get button caption
    this.getButtonCaption = function(button) {
        if (isEmpty(button)) {
            button = this.currentButton;
        }

        // return caption, if it is defined
        if ('caption' in this.buttonList[button]) {
            return this.buttonList[button].caption;
        // else, return button name
        } else {
            return button;
        }
    };

    // Get button name
    this.getButtonName = function(button) {
        return '#' + this.buttonPrefix + button;
    };

    // Set option buttons classes
    this.formatButtons = function() {
        // loop over all allowed buttons and set button class
        var buttonNames = Object.keys(this.buttonList);
        for (var i = 0; i < buttonNames.length; i++) {
            var buttonClass;

            // set active button
            if (buttonNames[i] === this.currentButton) {
                buttonClass = CLASS_BUTTON_ACTIVE;
            } else {
                buttonClass = CLASS_BUTTON_NORMAL;
            }

            // apply classes to button divs
            $(this.getButtonName(buttonNames[i])).attr('class', buttonClass);
        }
    };
    // Attach events to toggle buttons
    this.attachButtonEvent = function(button) {
        if (isEmpty(button)) {
            button = this.defaultButton;
        }

        // assign classInstance 'this' to a local variable because 'this' is
        // redeclared in the scope of the following anonymous function
        var classInstance = this;

        $(this.getButtonName(button)).click(function() {
            classInstance.setCurrentButton(button);
            classInstance.formatButtons();

            // execute custom click events
            // general event (for all buttons)
            if (!isEmpty(classInstance.onClick)) {
                classInstance.onClick();
            }
            // specific button event
            if ('onClick' in classInstance.buttonList[button]) {
                classInstance.buttonList[button].onClick();
            }
        });
    };
    // loop over list of buttons to attach click events
    this.initButtons = function() {
        this.setCurrentButton(getUrlParameter(this.name));

        var buttonNames = Object.keys(this.buttonList);
        for (var i = 0; i < buttonNames.length; i++) {
            var button  = buttonNames[i];

            this.attachButtonEvent(button);

            $(this.getButtonName(button))
                .html(this.getButtonCaption(button));
        }

        this.formatButtons();
    };
}

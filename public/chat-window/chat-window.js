function toggleChatWindow(){
        jQuery.fx.off = true;
        jQuery("div#chat-close-button").toggle("slow", function() {
        });
        jQuery("label.inputOutline").toggle("slow", function() {
        });
        jQuery("div#scrollingChat").toggle("slow", function() {
            // Animation complete.
                if(jQuery("div#scrollingChat").is(":hidden")){
                    jQuery("div#titlebar").removeClass("chat-titlebar");
                    jQuery("div#titlebar").addClass("chat-button");
                    jQuery("span#titlebarlabel").html("Chat online");
                    jQuery("div#chatcolumn").addClass("minimized-chat");
                    jQuery("div#chatcolumn").removeClass("restored-chat");
                    jQuery("div#titlebar").removeClass("restored-chat");
                    jQuery("div#inputBar").removeClass("restored-chat");
                } else {
                    jQuery("div#titlebar").removeClass("chat-button");
                    jQuery("div#titlebar").addClass("chat-titlebar");
                    jQuery("span#titlebarlabel").html("Lis - Assistente SENAI");
                    jQuery("div#chatcolumn").removeClass("minimized-chat");
                    jQuery("div#chatcolumn").addClass("restored-chat");
                    jQuery("div#titlebar").addClass("restored-chat");
                    jQuery("div#inputBar").addClass("restored-chat");
                }
                jQuery("div#scrollingChat").css('overflow-y','scroll');
        });
    }
      jQuery(document).ready(function() {
          jQuery("#ChatContent").load("http://chatsenai.mybluemix.net/chat-window/chat-window.html"); 
          javascriptCheck();
            jQuery('#id_contextdump').hide();
			 jQuery("#btn-chat").click(function() {
		 		onChatClick();
	  		 });
			//enter 			 
			jQuery( "#btn-input" ).keypress(function( event ) {
			  if ( event.which == 13 ) {
				 event.preventDefault();
				onChatClick();
			  }
			});
			 jQuery("#btn-chat-init").click(function(){
			     onInitClick();
			 });
			
          ConversationPanel.init();
          PayloadPanel.init();
      });
        
      // if javascript is enabled on the browser then can
      // remove the warning message
      function javascriptCheck() {
        jQuery('#no-script').remove();
      }

function getTimeStamp(){
//	var time = new Date();
//	var stime = String.slice("0"+time.getHours(),-2) + ":" + String.slice("0"+time.getMinutes(),-2) + ":" + String.slice("0"+time.getSeconds(),-2);

   //cria um objeto do tipo date
   var data = new Date();
   
   // obtem o dia, mes e ano
   dia = data.getDate();
   mes = data.getMonth() + 1;
   ano = data.getFullYear();
   
   //obtem as horas, minutos e segundos
   horas = data.getHours();
   minutos = data.getMinutes();
   segundos = data.getSeconds();
   
   //converte as horas, minutos e segundos para string
   str_horas = new String(horas);
   str_minutos = new String(minutos);
   str_segundos = new String(segundos);
   
   //se tiver menos que 2 digitos, acrescenta o 0
   if (str_horas.length < 2)
      str_horas = "0" + str_horas;
   if (str_minutos.length < 2)
      str_minutos = "0" + str_minutos;
   if (str_segundos.length < 2)
      str_segundos = "0" + str_segundos;
   
   //converte o dia e o mes para string
   str_dia = new String(dia);
   str_mes = new String(mes);
   
   //se tiver menos que 2 digitos, acrescenta o 0
   if (str_dia.length < 2) 
      str_dia = "0" + str_dia;
   if (str_mes.length < 2) 
      str_mes = "0" + str_mes;
   
   //cria a string que sera exibida na div
   data = str_dia + '/' + str_mes + '/' + ano + ' - ' + str_horas + ':' + str_minutos + ':' + str_segundos;
return data;
}
//chat.js

// The Common module is designed as an auxiliary module
// to hold functions that are used in multiple other modules
/* eslint no-unused-vars: "off" */

var Common = (function() {
  // Publicly accessible methods defined
  return {
    buildDomElement: buildDomElementFromJson,
    fireEvent: fireEvent,
    listForEach: listForEach
  };

  // Take in JSON object and build a DOM element out of it
  // (Limited in scope, cannot necessarily create arbitrary DOM elements)
  // JSON Example:
  //  {
  //    "tagName": "div",
  //    "text": "Hello World!",
  //    "className": ["aClass", "bClass"],
  //    "attributes": [{
  //      "name": "onclick",
  //      "value": "alert("Hi there!")"
  //    }],
  //    "children: [{other similarly structured JSON objects...}, {...}]
  //  }
  function buildDomElementFromJson(domJson) {
    // Create a DOM element with the given tag name
    var element = document.createElement(domJson.tagName);

    // Fill the "content" of the element
    if (domJson.text) {
      element.innerHTML = domJson.text;
    } else if (domJson.html) {
      element.insertAdjacentHTML('beforeend', domJson.html);
    }

    // Add classes to the element
    if (domJson.classNames) {
      for (var i = 0; i < domJson.classNames.length; i++) {
        element.classList.add(domJson.classNames[i]);
      }
    }
    // Add attributes to the element
    if (domJson.attributes) {
      for (var j = 0; j < domJson.attributes.length; j++) {
        var currentAttribute = domJson.attributes[j];
        element.setAttribute(currentAttribute.name, currentAttribute.value);
      }
    }
    // Add children elements to the element
    if (domJson.children) {
      for (var k = 0; k < domJson.children.length; k++) {
        var currentChild = domJson.children[k];
        element.appendChild(buildDomElementFromJson(currentChild));
      }
    }
    return element;
  }

  // Trigger an event to fire
  function fireEvent(element, event) {
    var evt;
    if (document.createEventObject) {
      // dispatch for IE
      evt = document.createEventObject();
      return element.fireEvent('on' + event, evt);
    }
    // otherwise, dispatch for Firefox, Chrome + others
    evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, true); // event type,bubbling,cancelable
    return !element.dispatchEvent(evt);
  }

  // A function that runs a for each loop on a List, running the callback function for each one
  function listForEach(list, callback) {
    for (var i = 0; i < list.length; i++) {
      callback.call(null, list[i]);
    }
  }
}());






//api.js

// The Api module is designed to handle all interactions with the server

var Api = (function() {
  var requestPayload;
  var responsePayload;
  var messageEndpoint = 'http://chatsenai.mybluemix.net/api/message';

  // Publicly accessible methods defined
  return {
    sendRequest: sendRequest,

    // The request/response getters/setters are defined here to prevent internal methods
    // from calling the methods without any of the callbacks that are added elsewhere.
    getRequestPayload: function() {
      return requestPayload;
    },
    setRequestPayload: function(newPayloadStr) {
      requestPayload = JSON.parse(newPayloadStr);
    },
    getResponsePayload: function() {
      return responsePayload;
    },
    setResponsePayload: function(newPayloadStr) {
      responsePayload = JSON.parse(newPayloadStr);
    }
  };

  // Send a message request to the server
  function sendRequest(text, context) {
    // Build request payload
    var payloadToWatson = {};
    if (text) {
      payloadToWatson.input = {
        text: text
      };
    }
    if (context) {
      payloadToWatson.context = context;
    }

    // Built http request
    var http = new XMLHttpRequest();
    http.open('POST', messageEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState === 4 && http.status === 200 && http.responseText) {
        Api.setResponsePayload(http.responseText);
      }
    };

    var params = JSON.stringify(payloadToWatson);
    // Stored in variable (publicly visible through Api.getRequestPayload)
    // to be used throughout the application
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setRequestPayload(params);
    }

    // Send request
    http.withCredentials = true;
    http.send(params);
  }
}());





/// conversation.js

// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function() {
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    inputKeyDown: inputKeyDown,
    tapClick: tapClick,
    getChatLog: getChatLog
  };

  // Initialize the module
  function init() {
    chatUpdateSetup();
//    getChatLog();
    Api.sendRequest( '', null );
    setupInputBox();
  }
  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.watson);
    };
  }

// Set up the input box to underline text as it is typed
  // This is done by creating a hidden dummy version of the input box that
  // is used to determine what the width of the input text should be.
  // This value is then used to set the new width of the visible input box.
  function setupInputBox() {
    var input = document.getElementById('textInput');
    var dummy = document.getElementById('textInputDummy');
    var minFontSize = 14;
    var maxFontSize = 16;
    var minPadding = 4;
    var maxPadding = 6;

    // If no dummy input box exists, create one
    if (dummy === null) {
      var dummyJson = {
        'tagName': 'div',
        'attributes': [{
          'name': 'id',
          'value': 'textInputDummy'
        }]
      };

      dummy = Common.buildDomElement(dummyJson);
//      document.body.appendChild(dummy);
    }

    function adjustInput() {
      if (input.value === '') {
        // If the input box is empty, remove the underline
        input.classList.remove('underline');
        input.setAttribute('style', 'width:' + '100%');
        input.style.width = '100%';
      } else {
        // otherwise, adjust the dummy text to match, and then set the width of
        // the visible input box to match it (thus extending the underline)
        input.classList.add('underline');
        var txtNode = document.createTextNode(input.value);
        ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
          'text-transform', 'letter-spacing'].forEach(function(index) {
            dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
          });
        dummy.textContent = txtNode.textContent;

        var padding = 0;
        var htmlElem = document.getElementsByTagName('html')[0];
        var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
        if (currentFontSize) {
          padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize)
            * (maxPadding - minPadding) + minPadding);
        } else {
          padding = maxPadding;
        }

        var widthValue = ( dummy.offsetWidth + padding) + 'px';
        input.setAttribute('style', 'width:' + widthValue);
        input.style.width = widthValue;
      }
    }

    // Any time the input changes, or the window resizes, adjust the size of the input box
//    input.addEventListener('input', adjustInput);
    window.addEventListener('resize', adjustInput);

    // Trigger the input event once to set up the input box and dummy element
    Common.fireEvent(input, 'input');
  }

  function getChatLog() {
    var http = new XMLHttpRequest();
    http.open('GET', "http://chatsenai.mybluemix.net/api/message?chatlog=true", true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState === 4 && http.status === 200 && http.responseText) {
        var messages = JSON.parse(http.responseText);
        var i=0;
        for (i=0; i < messages.length; i++) {
          if (messages[i].from == "user") {
            displayMessage({"input":{"text":messages[i].message}},"user");
          } else if (messages[i].from == "watson") {
            displayMessage({"output":{"text":messages[i].message}},"watson");
          }
        }
        if (i == 0) {
          Api.sendRequest( '', null );
        }
      }
    };
    http.withCredentials = true;
    http.send();
  }
  // Display a user or Watson message that has just been sent/received
  function displayMessage(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload.input && newPayload.input.text)
      || (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser
              ? settings.selectors.fromUser : settings.selectors.fromWatson)
              + settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function(element) {
          element.classList.remove('latest');
        });
      }

      messageDivs.forEach(function(currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });
      // Move chat to the most recent messages when new messages are added
      scrollToChatBottom();
    }
  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var textArray = isUser ? newPayload.input.text : newPayload.output.text;
    if (Object.prototype.toString.call( textArray ) !== '[object Array]') {
      textArray = [textArray];
    }
    var messageArray = [];

    textArray.forEach(function(currentText) {
      if (currentText) {
        var messageJson = {
          // <div class='segments'>
          'tagName': 'div',
          'classNames': ['segments'],
          'children': [{
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': [(isUser ? 'from-user' : 'from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': ['message-inner'],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': currentText
              }]
            }]
          }]
        };
        messageArray.push(Common.buildDomElement(messageJson));
      }
    });

    return messageArray;
  }

  // Scroll to the bottom of the chat window (to the most recent messages)
  // Note: this method will bring the most recent user message into view,
  //   even if the most recent message is from Watson.
  //   This is done so that the "context" of the conversation is maintained in the view,
  //   even if the Watson message is long.
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');

    // Scroll to the latest message sent by the user
    var scrollEl = scrollingChat.querySelector(settings.selectors.fromUser
            + settings.selectors.latest);
    if (scrollEl) {
      scrollingChat.scrollTop = scrollEl.offsetTop;
    }
  }

  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      // Retrieve the context from the previous server response
      var context;
      var latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }


      // Send the user message
      Api.sendRequest(inputBox.value, context);

      // Clear input box for further messages
      inputBox.value = '';
      Common.fireEvent(inputBox, 'input');
    }
  }
  function tapClick(inputText) {
    var context;
    var latestResponse = Api.getResponsePayload();
    if (latestResponse) {
      context = latestResponse.context;
    }

    // Send the user message
    Api.sendRequest(inputText, context);
  }
}());





/// payload.js

// The PayloadPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true, PayloadPanel: true*/

var PayloadPanel = (function() {
  var settings = {
    selectors: {
      payloadColumn: '#payload-column',
      payloadInitial: '#payload-initial-message',
      payloadRequest: '#payload-request',
      payloadResponse: '#payload-response'
    },
    payloadTypes: {
      request: 'request',
      response: 'response'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    togglePanel: togglePanel
  };

  // Initialize the module
  function init() {
    payloadUpdateSetup();
  }

  // Toggle panel between being:
  // reduced width (default for large resolution apps)
  // hidden (default for small/mobile resolution apps)
  // full width (regardless of screen size)
  function togglePanel(event, element) {
    var payloadColumn = document.querySelector(settings.selectors.payloadColumn);
    if (element.classList.contains('full')) {
      element.classList.remove('full');
      payloadColumn.classList.remove('full');
    } else {
      element.classList.add('full');
      payloadColumn.classList.add('full');
    }
  }

  // Set up callbacks on payload setters in Api module
  // This causes the displayPayload function to be called when messages are sent / received
  function payloadUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayPayload(settings.payloadTypes.request);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayload) {
      currentResponsePayloadSetter.call(Api, newPayload);
      displayPayload(settings.payloadTypes.response);
    };
  }

  // Display a request or response payload that has just been sent/received
  function displayPayload(typeValue) {
    var isRequest = checkRequestType(typeValue);
    if (isRequest !== null) {
      // Create new payload DOM element
      var payloadDiv = buildPayloadDomElement(isRequest);
      var payloadElement = document.querySelector(isRequest
              ? settings.selectors.payloadRequest : settings.selectors.payloadResponse);
      // Clear out payload holder element
      while (payloadElement.lastChild) {
        payloadElement.removeChild(payloadElement.lastChild);
      }
      // Add new payload element
      payloadElement.appendChild(payloadDiv);
      // Set the horizontal rule to show (if request and response payloads both exist)
      // or to hide (otherwise)
      var payloadInitial = document.querySelector(settings.selectors.payloadInitial);
      if (Api.getRequestPayload() || Api.getResponsePayload()) {
        payloadInitial.classList.add('hide');
      }
    }
  }

  // Checks if the given typeValue matches with the request "name", the response "name", or neither
  // Returns true if request, false if response, and null if neither
  // Used to keep track of what type of payload we're currently working with
  function checkRequestType(typeValue) {
    if (typeValue === settings.payloadTypes.request) {
      return true;
    } else if (typeValue === settings.payloadTypes.response) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element to use in displaying the payload
  function buildPayloadDomElement(isRequest) {
    var payloadPrettyString = jsonPrettyPrint(isRequest
            ? Api.getRequestPayload() : Api.getResponsePayload());

    var payloadJson = {
      'tagName': 'div',
      'children': [{
        // <div class='header-text'>
        'tagName': 'div',
        'text': isRequest ? 'Entrada do Usuário' : 'Watson entendeu',
        'classNames': ['header-text']
      }, {
        // <div class='code-line responsive-columns-wrapper'>
        'tagName': 'div',
        'classNames': ['code-line', 'responsive-columns-wrapper'],
        'children': [{
          // <div class='line-numbers'>
          'tagName': 'pre',
          'text': createLineNumberString((payloadPrettyString.match(/\n/g) || []).length + 1),
          'classNames': ['line-numbers']
        }, {
          // <div class='payload-text responsive-column'>
          'tagName': 'pre',
          'classNames': ['payload-text', 'responsive-column'],
          'html': payloadPrettyString
        }]
      }]
    };

    return Common.buildDomElement(payloadJson);
  }

  // Format (payload) JSON to make it more readable
  function jsonPrettyPrint(json) {
    if (json === null) {
      return '';
    }
    var convert = JSON.stringify(json, null, 2);

    convert = convert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(
      />/g, '&gt;');
    convert = convert
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
          var cls = 'number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key';
            } else {
              cls = 'string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean';
          } else if (/null/.test(match)) {
            cls = 'null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        });
    return convert;
  }

  // Used to generate a string of consecutive numbers separated by new lines
  // - used as line numbers for displayed JSON
  function createLineNumberString(numberOfLines) {
    var lineString = '';
    var prefix = '';
    for (var i = 1; i <= numberOfLines; i++) {
      lineString += prefix;
      lineString += i;
      prefix = '\n';
    }
    return lineString;
  }
}());






//// global.js


/* global ConversationPanel: true, PayloadPanel: true*/
/* eslint no-unused-vars: "off" */

// Other JS files required to be loaded first: apis.js, conversation.js, payload.js
(function() {
  // Initialize all modules
//  ConversationPanel.init();
//  PayloadPanel.init();
})();


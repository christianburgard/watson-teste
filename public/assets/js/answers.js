$("#menu_answers").addClass("active");
var Answers = (function(){
  
        /*################### CONSTANTS ######################*/

        /*################### PRIVATE FIELDS ######################*/
        var _intents = [];
        var _currentIntent;
        var _currentAnswer;

        /*################### PROPERTIES ##########################*/

        var currentIntent = function() {
            return _currentIntent;
        }
        /*###################### METHODS #########################*/
        
        var getIntents = function(){
            var loading = $("#filter_intent div.loader").first();
            loading.show();

              $.ajax({
                cache: false,
                type: 'get',
                url: "/api/intents",
                dataType: "json"
             }).done(function(data){
                 loading.hide();
               renderIntents(data);
             }).fail(function(){
                console.log("Erro: Não foi possível recuperar a lista de temas.")
             }).always(function(){
                 loading.hide();
             });
        }

        var getAnswers = function(intent){

            if (!intent._id){
                console.log("não foi possível recuperar a lista de questões (Intent ID)");
                return;
            }
           
            
            var answerList = document.getElementById("answer_list");
            answerList.innerHTML = "";


            var loading = $("#answers div.loader").first();
             loading.show();

              $.ajax({
                cache: false,
                type: 'get',
                url: "/api/answers",
                data: {intent: intent.intent},
                dataType: "json"
             }).done(function(data){
              //  console.log(data);
               renderAnswers(data);
                loading.hide();
             }).fail(function(){
                console.log("Erro: Não foi possível recuperar a lista de temas.")
             }).always(function(){
                 loading.hide();
             });
        }


        var renderAnswers = function(data){
            if(data.length != 1){
                console.log("Erro ao renderizar respostas");
                return;
            }
            
            var answer = data[0];
            if(answer.output.text.values == null || answer.output.text.values == undefined) {
                answer.output.text.values = [];
            }

            _currentAnswer = answer;

            selectPolicy($('[data-policy="'+_currentAnswer.output.text.selection_policy+'"]').first());
            
            updateCounter(answer);
           
            var answerList = document.getElementById("answer_list");
           
           answerList.innerHTML = "";
          
           
           for (var index = 0; index < answer.output.text.values.length; index++) {
               var text =  answer.output.text.values[index];   
               appendAnswer(text);
           }
        }

        var saveAnswer = function(){
            
            // Verifica se há alguma resposta não adicionada
            var answerText = $("#answer_input").val().trim();
            if(answerText !== "") {
                if(!confirm("Há uma resposta digitada que não foi adicionada ao quadro de respostas. Deseja salvar mesmo assim?")) {
                    return;
                }
            }

           

            $.ajax({
                type: 'post',
                url: "/api/answers",
                dataType: "json",
                data: _currentAnswer
            }).done(function(data){

            if(data.ok === true){
                console.log("Answer Saved!");
                _currentAnswer._id = data.id;
                _currentAnswer._rev = data.rev;
                 // Limpa o campo de input de respostas 
                $("#answer_input").val("");
                
                alertSucess("<b>Sucesso!</b> A resposta foi salva!");
            } 
            else 
            {
                console.log("Erro ao salvar a questão: "+JSON.stringify(data));
            }
            }).fail(function(){
                console.log("Erro: Não foi possível salvar a questão.")
            });
        }
        var removeAnswerOutput = function(element){


            if(!confirm("Deseja excluir esta resposta?")) {
                return;
            }

            var text = element[0].answerText;
            for (var i = 0; i < _currentAnswer.output.text.values.length; i++) {
                var item = _currentAnswer.output.text.values[i];
                if(item == text){
                    _currentAnswer.output.text.values.splice(i,1);
                    break;
                }
            }    
            
            element[0].parentElement.parentElement.removeChild(element[0].parentElement);

            
            updateCounter(_currentAnswer);
        }

        var addAnswerOutput = function(){
            var answerText = $("#answer_input").val();
            answerText = answerText.replace(/\?+/gi,"").trim();
            if(answerText == "") return;

            _currentAnswer.output.text.values.push(answerText);
            appendAnswer(answerText);
            updateCounter(_currentAnswer);
            clearInput();
        }
                    
        /************* UI ******************/
        var updateCounter = function(intent){
            try{
                var selector = "#intent_"+intent.intent+" .badge";
                var element = $(selector).first();
                
                $(element).html(intent.output.text.values.length.toString());
            } 
            catch(e){

            }
        }
        var renderIntents = function(data){
           
            var intentList = document.getElementById("intent_list");
            for (var index = 0; index < data.length; index++) {
                var intent = data[index];
                
                var a = document.createElement("a");
                a.href = "#";
                a.className =  "app-selectIntent"
                a.text = intent.intent;

                var badge = document.createElement("span");
                badge.className = "badge";
                badge.innerHTML = intent.examples.length;

                //a.appendChild(badge);


                var li = document.createElement("li");
                li.id = "intent_"+intent.intent;
                li.appendChild(a);
                li.intent = intent;
                
                
                intentList.appendChild(li);
                
           }

            selectIntent($("#intent_list li").first());
        }


        var selectIntent = function(element){
            if(element.length == 0) return;
            
            _currentIntent =  element[0].intent;
         
            
            var intentList = document.getElementById("intent_list");
             
            $("#intent_list li").removeClass("selected");

            element[0].classList.add("selected"); 

            getAnswers(_currentIntent);


        }
        
        var appendAnswer = function(answer, onTop){

            var prepend = (onTop === true);

            var answerList = document.getElementById("answer_list");

            var li = document.createElement("li");
            li.innerText = answer;

            var button = document.createElement("button");
            button.classList.add("btn");
            button.classList.add("badge");
            button.answerText = answer;
            button.innerText = "x";

            li.appendChild(button);

            if (prepend) {
               answerList.insertBefore(li,answerList.firstChild);

            } else {
                answerList.appendChild(li);
            }
        }

        var clearInput = function(){
            $("#answer_input").val("");
        }
        var selectPolicy = function(option){
            var policy = $(option).data("policy");
            var policyName = $(option).text();
            _currentAnswer.output.text.selection_policy = policy;
            $("#policy_selected span").first().html(policyName);
        }

        var init = function(){
            getIntents();
           
            $( "#intent_list" ).on( "click", "li", function() {
                  selectIntent($(this));
            });
            
            $( "#answer_list" ).on( "click", "button", function() {
                //var answerId = $(this).data("id");
                removeAnswerOutput($(this));
            });

            $("#add_item").on("click",function(){
                addAnswerOutput();
            }); 
           $("#answer_input").on("keypress", function(event) {
			  if ( event.which == 13 ) {
				addAnswerOutput();
			  }
            });
            $( "#policy_list" ).on( "click", "li", function() {
                selectPolicy($(this));
            });
            $("#send_item").on("click",function(){
                saveAnswer();
            }); 
            
        }
        /******************************/
        /*        IIFE - Return       */
        /******************************/

        init(); 

        return {

            getIntents: getIntents,
            currentIntent: currentIntent
        };
})
();
require(['app/API','../../examples/dscore/Scorer'], function(API,Scorer) {
	var category1 = 'Pleasent';
	var category2 = 'Unpleasent';

	//Set the size of the screen
	API.addSettings('canvas',{
		maxWidth: 1000,
		proportions : 0.8,
		//Change the colors to allow better presentation of the colored stimuli.
		background: 'white',
		canvasBackground: 'green',
		borderWidth: 5,
		borderColor: 'black'
	});

	//the source of the images
	API.addSettings('base_url',{
		image : '../examples/images'
	});

	API.addSettings('logger',{
        pulse: 20,
        url : '/implicit/PiPlayerApplet',

        // use default logger (as copied from documents.txt but replace the regular latency with the computed latency)
        logger: function(trialData, inputData, actionData, logStack){

			var stimList = this._stimulus_collection.get_stimlist();
			var mediaList = this._stimulus_collection.get_medialist();

			var myLatency = inputData.latency;
			if (trialData.begin > 0) {
				myLatency = inputData.latency - trialData.begin;
			}

			return {
				log_serial : logStack.length,
				trial_id: this._id,
				name: this.name(),
				responseHandle: inputData.handle,
				latency: myLatency, // computed latency
				absoluteLatency : inputData.latency, // original latency
				stimuli: stimList,
				media: mediaList,
				data: trialData
			};
        }

    });

	//the Scorer that compute the user feedback
	Scorer.addSettings('compute',{
		ErrorVar:'score',
		condVar:"trialCategories",
		cond1VarValues: ["Black People/Bad Words","White People/Good Words"], //condition 1
		cond2VarValues: ["Black People/Good Words","White People/Bad Words"], //condition 2
		parcelVar : "parcel",
		parcelValue : ["research"],
		fastRT : 150, //Below this reaction time, the latency is considered extremely fast.
		maxFastTrialsRate : 0.1, //Above this % of extremely fast responses within a condition, the participant is considered too fast.
		minRT : 150, //Below this latency
		maxRT : 5000, //above this
		errorLatency : {use:"false", penalty:600, useForSTD:true}//ignore error respones
	});

	Scorer.addSettings('message',{
		MessageDef: [
			{ cut:'-0.3', message:'Your data suggest an automatic preference for black people over white people.' },//D < -0.3
			{ cut:'0.3', message:'Your data suggest no or slight difference in your preference between white people and black people.' },// -0.3 <= D <= 0.3
			{ cut:'5', message:'Your data suggest an automatic preference for white people over black people.' }// D > 0.3 (and D<=5)
		]
	});

	//Define the basic trial (the prsentation of the images and words)
	API.addTrialSets({
		basicTrial: [{
			data : {score:0},// by default each trial is correct, this is modified in case of an error
			//Layout defines what will be presented in the trial. It is like a background display.
			layout: [
				{location:{left:15,top:3},media:{word:'key: e'}, css:{color:'black','font-size':'1em'}},
				{location:{left:75,top:3},media:{word:'key: i'}, css:{color:'black','font-size':'1em'}},
				{location:{left:10,top:6},media:{word:category2}, css:{color:'white','font-size':'2em'}},
				{location:{left:70,top:6},media:{word:category1}, css:{color:'white','font-size':'2em'}}
			],

			input: [
				{handle:'enter',on:'enter'} //'enter' to skip the current block
			],

			//Set what to do.
			interactions: [
				{
					propositions: [{type:'begin'}],
					actions: [
						{type:'showStim',handle:'primingImage'},// display the first stimulus
						{type:'setInput',input:{handle:'primeOut',on:'timeout',duration:300}}
					]
				},
				{
					propositions: [{type:'inputEquals',value:'primeOut'}], // on time out
					actions: [
						{type:'hideStim',handle:'primingImage'}, // hide the first stimulus
						{type:'showStim',handle:'targetStim'},// and show the second one
						//Set the possible key inputs.
						{type:'setInput',input:{handle:category2,on: 'keypressed', key:'e'}},
						{type:'setInput',input:{handle:category1,on: 'keypressed', key:'i'}},
						{type:'setInput',input:{handle:category2,on:'leftTouch',touch:true}},
						{type:'setInput',input:{handle:category1,on:'rightTouch',touch:true}},
						{type:'setTrialAttr',setter:function(data,event){
							data.begin = event.latency;
						}}
					]
				},
				// there are 2 possible responses: "pleasent" and "unpleasent", here we handle these responses when the user answers
				// matches the word value (correct response)
				{
					propositions: [
						{type:'stimEquals',value:'wordCategory'}],
					actions: [
						{type:'log'}, // here we call the log action. This is because we want to record the latency of this input (the latency of the response)
						{type:'removeInput',inputHandle:[category2,category1]},//only one response is possible
						{type:'trigger', handle:'showFix'}//End the trial immidiatlly after correct response
					]
				},
				// there are 2 possible responses: "pleasent" and "unpleasent", here we handle with these responses when the user answer
				// doesn't match the word value (incorrect response)
				//this propositions are true only after incorrect response
				// handle incorrect response.
				//this propositions are true only after incorrect response
				{
					propositions: [
						{type:'stimEquals',value:'wordCategory', negate:true},
						{type:'inputEquals',value: [category1, category2]} // This is a category action - as opposed to some timeout.
					],
					actions: [
						{type:'setTrialAttr', setter:{score:1}},
						{type:'log'}, // here we call the log action. This is because we want to record the latency of this input (the latency of the response)
						{type:'showStim',handle:'errorFB'}, //show error feedback
						{type:'removeInput',inputHandle:[category2,category1]},// block the option to change the answer or to answer twice
						{type:'setInput',input:{handle:'showFix', on:'timeout',duration:250}} //End the trial in 250ms (show the x until then)
					]
				},

				{
					propositions: [{type:'inputEquals',value:'showFix'}], //What to do when endTrial is called.
					actions: [
						{type:'hideStim',handle:'All'},
						{type:'showStim',handle:'blankScreen'}, //show blankScreen
						{type:'setInput',input:{handle:'endTrial', on:'timeout',duration:{min:300, max: 900}}} // randomly pick from within a range
					]

				},
					// skip block -> if you press 'enter' you will skip the current block.
				{
					propositions: [{type:'inputEquals',value:'enter'}],
					actions: [
						{type:'goto', destination: 'nextWhere', properties: {blockStart:true}},
						{type:'endTrial'}
					]
				},
				{
					propositions: [{type:'inputEquals',value:'endTrial'}], //What to do when endTrial is called.
					actions: [{type:'endTrial'}]
				}
			] // end interactions
		}] // end basic trial
	}); // end trialsets

	API.addTrialSets({
		//pleasant+white people (condition 1)
		pleasentWhite:[{
			data: {parcel:'research', condition: "pleasant/white"},
			inherit:{set: 'basicTrial'},
			stimuli: [
				{ inherit: {set: 'targetStimulusA', type:'exRandom'}, data : {handle:'targetStim'} },
				{ inherit: {set: 'primingImage1', type:'exRandom'}, data : {handle:'primingImage'} },
				{ inherit: 'errorFB'},
				{ inherit: 'blankScreen'}
			]
		}],

		//pleasant+black people (condition 2)
		pleasentBlack:[{
			data: {parcel:'research',condition: "pleasant/black "},
			inherit:{set: 'basicTrial'},
			stimuli: [
			{ inherit: {set: 'targetStimulusA', type:'exRandom'}, data : {handle:'targetStim'} },
			{ inherit: {set: 'primingImage2', type:'exRandom'}, data : {handle:'primingImage'} },
			{ inherit: 'errorFB'},
			{ inherit: 'blankScreen'}
			]
		}],

		//unpleasant+white people (condition 2)
		unpleasentWhite:[{
			data: {parcel:'research',condition: "unpleasant/white"},
			inherit:{set: 'basicTrial'},
			stimuli: [
			{ inherit: {set: 'targetStimulusB', type:'exRandom'}, data : {handle:'targetStim'} },
			{ inherit: {set: 'primingImage1', type:'exRandom'}, data : {handle:'primingImage'} },
			{ inherit: 'errorFB'},
			{ inherit: 'blankScreen'}
			]
		}],

		//unpleasant+ black people (condition 1)
		unpleasentBlack:[{
			data: {parcel:'research',condition: "unpleasant/black"},
			inherit:{set: 'basicTrial'},
			stimuli: [
			{ inherit: {set: 'targetStimulusB', type:'exRandom'}, data : {handle:'targetStim'} },
			{ inherit: {set: 'primingImage2', type:'exRandom'}, data : {handle:'primingImage'} },
			{ inherit: 'errorFB'},
			{ inherit: 'blankScreen'}
			]
		}]
	});

	//Create the stimuli
	API.addStimulusSets({
	//These are diffrent types of stimuli.
	//That way we can later create a stimulus object the inherits from this set randomly.

		// This Default stimulus is inherited by the other stimuli so that we can have a consistent look and change it from one place
		Default: [
			{css:{color:'white','font-size':'2em'}}
		],
		targetStimulusA: [	//first catagory of words
			{
				data : {wordCategory:category1, alias:category1},
				inherit:'Default',
				media: {inherit:{type:'exRandom',set:'targetWordsA'}} //Select a word from the media, randomly
			}
			],

		targetStimulusB: [	//the second catagory of words
			{
				data : {wordCategory:category2, alias:category2},
				inherit:'Default',
				media: {inherit:{type:'exRandom',set:'targetWordsB'}}
			}
		],
		errorFB : [//Error feedback stimulus
			{
				data : {handle:'errorFB'},
				size: {height:15,width:15},
				location: {top:70},
				media: {image:'cross.png'}, //An image.
				nolog:true
			}
		],
		blankScreen : [//blankScreen  stimulus (in between the trials) can be used as a fixation point
			{
				data : {handle:'blankScreen'},
				media: {word:' '},//can be replace with '+'
				nolog:true
			}
		],

		//priming stimulus: the catagories of images
		primingImage1 : [
			{
				data : {handle:'primingImage',alias:'white'},
				inherit:'Default',
				media: {inherit:{type:'exRandom',set:'Images1'}}
			}
		],
		primingImage2 : [
			{
				data : {handle:'primingImage',alias:'black'},
				inherit:'Default',
				media: {inherit:{type:'exRandom',set:'Images2'}}
			}
		]
	});

	//Create materials (media) for the stimulus
	//Twp categories of images, and two categories of words.
	API.addMediaSets({
		Images1: [
			{image: 'sw01.jpg'},
			{image: 'sw02.jpg'},
			{image: 'sw03.jpg'},
			{image: 'sw04.jpg'},
			{image: 'sw05.jpg'},
			{image: 'sw06.jpg'},
			{image: 'sw07.jpg'},
			{image: 'sw08.jpg'},
			{image: 'sw09.jpg'},
			{image: 'sw10.jpg'},
			{image: 'sw11.jpg'},
			{image: 'sw12.jpg'}
		],
		Images2: [
			{image: 'sb01.jpg'},
			{image: 'sb02.jpg'},
			{image: 'sb03.jpg'},
			{image: 'sb04.jpg'},
			{image: 'sb05.jpg'},
			{image: 'sb06.jpg'},
			{image: 'sb07.jpg'},
			{image: 'sb08.jpg'},
			{image: 'sb09.jpg'},
			{image: 'sb10.jpg'},
			{image: 'sb11.jpg'},
			{image: 'sb12.jpg'}
		],
		targetWordsA: [
			{word: 'Paradise'},
			{word: 'Pleasure'},
			{word: 'Cheer'},
			{word: 'Friend'},
			{word: 'Splendid'},
			{word: 'Love'},
			{word: 'Glee'},
			{word: 'Smile'},
			{word: 'Enjoy'},
			{word: 'Delight'},
			{word: 'Beautiful'},
			{word: 'Attractive'},
			{word: 'Likeable'},
			{word: 'Wonderful'}
		],
		targetWordsB: [
			{word: 'Bomb'},
			{word: 'Abuse'},
			{word: 'Sadness'},
			{word: 'Pain'},
			{word: 'Poison'},
			{word: 'Grief'},
			{word: 'Ugly'},
			{word: 'Dirty'},
			{word: 'Stink'},
			{word: 'Noxious'},
			{word: 'Humiliate'},
			{word: 'Annoying'},
			{word: 'Disgusting'},
			{word: 'Offensive'}
		]
	});

	//Define the instructions trial
	API.addTrialSets('inst',{
		input: [
			{handle:'space',on:'space'}, //Will handle a SPACEBAR reponse
			{handle: 'enter', on:'enter'},
			{handle:'space',on:'centerTouch',touch:true}
		],
		interactions: [
			{ // begin trial
				propositions: [{type:'begin'}],
				actions: [{type:'showStim',handle:'All'}] //Show the instructions
			},
			{
				propositions: [{type:'inputEquals',value:'space'}], //What to do when space is pressed
				actions: [
					{type:'hideStim',handle:'All'}, //Hide the instructions
					{type:'setInput',input:{handle:'endTrial', on:'timeout',duration:500}} //In 500ms: end the trial. In the mean time, we get a blank screen.
				]
			},
				// skip block -> if you press 'enter' you will skip the current block.
				{
					propositions: [{type:'inputEquals',value:'enter'}],
					actions: [
						{type:'goto', destination: 'nextWhere', properties: {blockStart:true}},
						{type:'endTrial'}
					]
				},
			{
				propositions: [{type:'inputEquals',value:'endTrial'}], //What to do when endTrial is called.
				actions: [
					{type:'endTrial'} //End the trial
				]
			}
		]
	});

	//Defines the sequence of trials
	API.addSequence([
		{ //Instructions trial
			data: {blockStart:true},
			inherit : "inst",
			stimuli: [
				{//The instructions stimulus
					//the instructions that will be shown on the screen
					media:{html:'<div><p style="font-size:24px"><color="FFFAFA">Put your middle or index fingers on the <b>E</b> key of the keyboard, and the <b>I</b> key as well. <br/> Words and photos will appear one after another. Ignore the photos and categorize the words as pleasant or unpleasant.<br/><br/>When the word belongs to the catagory "Unpleasant", press the <b>E</b> key. <br/> when the word belongs to the category "Pleasant", press the <b>I</b> key.</br></br>If you make an error, an X will appear.</br>This is a timed sorting task. <b>GO AS FAST AS YOU CAN</b> while making as few mistakes as possible.<br>This task will take about 5 minutes to complete.<br> press on "space" to begin <br><br>[Round 1 of 3]</p></div>'}
				}
			]
		},
		{ //The presentation trials
			// Repeat 60 times the trial. (15 times each combination)
			mixer: 'random',		//
			data : [
				{
					mixer: 'repeat',
					times: 15,
					data : [
						{inherit: 'pleasentWhite',data:{block:0}},
						{inherit: 'pleasentBlack',data:{block:0}},
						{inherit: 'unpleasentWhite',data:{block:0}},
						{inherit: 'unpleasentBlack',data:{block:0}}
					]
				} // end wrapper
			]
		},
		{ //Instructions trial, second round
			data: {blockStart:true},
			inherit : "inst",
			stimuli: [
				{//The instructions stimulus
					media:{html:'<div><p style="font-size:28px"><color="#FFFAFA">Press "space" to continue with the same task.<br/><br/>Please try to challenge yourself to be as fast as you can without making mistakes<br/><br/>[Round 2 of 3].</p></div>'}
				}
			]
		},
		{ //The presentation trials
			// Repeat 60 times the trial. (15 times each combination)
			mixer: 'random',
			data : [
				{
					mixer: 'repeat',
					times: 15,
					data : [
						{inherit: 'pleasentWhite',data:{block:1}},
						{inherit: 'pleasentBlack',data:{block:1}},
						{inherit: 'unpleasentWhite',data:{block:1}},
						{inherit: 'unpleasentBlack',data:{block:1}}
					]
				} // end wrapper
			]
		},

		{ //Instructions trial, third round
			data: {blockStart:true},
			inherit : "inst",
			stimuli: [
				{//The instructions stimulus
					media:{html:'<div><p style="font-size:28px"><color="#FFFAFA">Press "space" for the last round.<br/><br/>[Round 3 of 3].</p></div>'}
				}
			]
		},
		{ //The presentation trials
			// Repeat 60 times the trial. (15 times each combination)
			mixer: 'random',		//
			data : [
				{
					mixer: 'repeat',
					times: 15,
					data : [
						{inherit: 'pleasentWhite',data:{block:2}},
						{inherit: 'pleasentBlack',data:{block:2}},
						{inherit: 'unpleasentWhite',data:{block:2}},
						{inherit: 'unpleasentBlack',data:{block:2}}
					]
				}
			]
		},
		// user feedback- here we will use the computeD function.
		{
			data: {blockStart:true},
			inherit: "inst",
			stimuli: [],
			customize: function(){
				var trial = this;
				console.log('calling Scorer');
				var DScore = Scorer.computeD();//compute the Dscore
				var FBMsg = Scorer.getFBMsg(DScore);//the user feedback
				console.log('DScore='+DScore+ " FBMsg="+FBMsg);
				var media = {media:{html:'<div><p style="font-size:28px"><color="#FFFFFF"> '+FBMsg+'<br>The Score is:'+DScore+'</p></div>'}};
				trial.stimuli.push(media);//show the user feedback
			}
		},

		{ //Instructions trial, the end of the task, instruction what to do next
			data: {blockStart:true},
			inherit : "inst",
			stimuli: [
				{//The instructions stimulus
					data : {'handle':'instStim'},
					media:{html:'<div><p style="font-size:28px"><color="#FFFAFA">You have completed the study<br/><br/>Thank you very much for your participation.<br/><br/> Press "space" for continue to next task.</p></div>'}
				}
			]
		}
	]);

	API.play();
});
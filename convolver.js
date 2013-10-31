define(['require', 'github:janesconference/KievII@0.6.0/kievII'], function(require, K2) {

    var imgResources = null;

    /* This gets returned to the host as soon as the plugin is loaded */
    var pluginConf = {
        name: "Convolver",
        osc: false,
        audioIn: 1,
        audioOut: 1,
        version: '0.0.1-alpha1',
        ui: {
            type: 'canvas',
            width: 346,
            height: 177
        }
    };

    /* This gets called when all the resources are loaded */
    var pluginFunction = function (args, resources) {

        var deckImage = resources[0];

        console.log ("plugin inited, args is", args, "KievII object is ", K2);

        this.name = args.name;
        this.id = args.id;

        // The sound part
        this.audioDestination = args.audioDestinations[0];
        this.audioSource = args.audioSources[0];
        this.audioContext = args.audioContext;

        //this.audioBuffer = null;
        this.convolver = this.audioContext.createConvolver();
        this.audioSource.connect (this.convolver);
        this.convolver.connect (this.audioDestination);

        this.ui = new K2.UI ({type: 'CANVAS2D', target: args.canvas}, {'breakOnFirstEvent': true});

        this.viewWidth = args.canvas.width;
        this.viewHeight = args.canvas.height;
        this.canvas = args.canvas;

        // Member methods
        this.drop = function (evt) {
            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.dataTransfer.files;
            var count = files.length;

            // Only call the handler if 1 or more files was dropped.
            if (count > 0)
            this.handleFiles(files);
        }.bind(this);

        this.handleFiles = function (files) {

            var file = files[0];
            console.log ("Loading ", file.name);
            var reader = new FileReader();

            // init the reader event handlers
            reader.onload = this.handleReaderLoad;
            // begin the read operation
            reader.readAsArrayBuffer(file);

        }.bind(this);

        this.playFinishedCallback = function () {
            console.log('playback finished');
        }
        this.viewCurrentTime = function (time) {
            console.log(time);
        }

        this.successCallback = function (decoded) {
            console.log ("Decode succeeded!");
            this.convolver.buffer = decoded;

            this.decoded_arrayL = decoded.getChannelData (0);

            // TODO check if the signal is mono or stero here
            // this.decoded_arrayR = decoded.getChannelData (1);

            console.log ("I got the data!");

            var waveID = 'wavebox_L';

            if (!(this.ui.isElement(waveID))) {

                // Wavebox parameters
                var waveboxArgs = {
                    ID: waveID,
                    top: 10,
                    left: 10,
                    width: this.canvas.width - 10 * 2,
                    height: 154,
                    isListening: true,
                    waveColor: '#00CC00',
                    transparency: 0.8
                };

                waveboxArgs.onValueSet = function (slot, value, element) {
                    console.log ("onValueSet callback: slot is ", slot, " and value is ", value, " while el is ", element);
                    this.ui.refresh();
                }.bind(this);

                var waveBox_L = new K2.Wavebox(waveboxArgs);
                this.ui.addElement(waveBox_L, {zIndex: 2});
            }

            this.ui.setValue ({elementID: waveID, slot: "waveboxsignal", value: this.decoded_arrayL});

            this.ui.refresh();

        }.bind(this);

        this.errorCallback = function () {
            console.log ("Error!");
            alert ("Error decoding ");
        }.bind(this);

        this.handleReaderLoad = function (evt) {

            this.loadedSample = evt.target.result;
            console.log (evt);

            console.log ("Decoding file");

            this.audioContext.decodeAudioData(evt.target.result, this.successCallback, this.errorCallback);

        }.bind(this);

        // Drop event
        this.noopHandler = function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
        };

        // Init event handlers
        this.canvas.addEventListener("dragenter", this.noopHandler, false);
        this.canvas.addEventListener("dragexit", this.noopHandler, false);
        this.canvas.addEventListener("dragover", this.noopHandler, false);
        this.canvas.addEventListener("drop", this.drop, false);

        // Background
        var bgArgs = new K2.Background({
            ID: 'background',
            image: deckImage,
            top: 0,
            left: 0
        });

        this.ui.addElement(bgArgs, {zIndex: 0});

        this.ui.refresh();

        var saveState = function () {
            var obj = { 
                bin: {
                    loadedSample: this.loadedSample
                } 
            };
            return obj;
        };
        args.hostInterface.setSaveState (saveState.bind (this));

        if (args.initialState && args.initialState.bin) {
            /* Load data */
            var evt = {
                target: {
                    result: args.initialState.bin.loadedSample
                }
            };
            this.handleReaderLoad (evt);
        }
        else {
            this.loadedSample = null;
        }

        // Initialization made it so far: plugin is ready.
        args.hostInterface.setInstanceStatus ('ready');
    };

    /* This function gets called by the host every time an instance of
       the plugin is requested [e.g: displayed on screen] */
    function initPlugin (initArgs) {

        var args = initArgs;

        console.log ("initArgs", initArgs);

        var requireErr = function (err) {
            args.hostInterface.setInstanceStatus ('fatal', {description: 'Error loading plugin resources.'});
        }.bind(this);

        console.log ("imgResources", imgResources);

        if (imgResources === null) {
            var resList = [ './assets/images/deck.png!image' ];

            console.log ("requiring...");

            require (resList,
                        function () {
                            console.log ("required...");
                            imgResources = arguments;
                            pluginFunction.call (this, args, arguments);
                        }.bind(this),
                        function (err) {
                            console.log ("require error");
                            requireErr (err);
                        }
                    );
        }

        else {
            pluginFunction.call (this, args, imgResources);
        }

    };

    return {
      initPlugin: initPlugin,
      pluginConf: pluginConf
    };
});

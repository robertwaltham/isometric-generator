var Generator = {
    options:{
        view_tc_width:20,
        view_tc_height:20,
        tile_count_x:50,
        tile_count_y:50,
        tile_half_x: 20,
        tile_half_y: 10,
        tile_base_scale: 0.4,
        offset_x: 500,
        offset_y: 64,
        canvas_width: 1000,
        canvas_height: 500,
        sprite_anchor: 0.5,
        minimap_size:150,
        texture_paths:{
            dirt:"resources/road/dirt.png",
            grass:"resources/road/grass.png",
            lot:"resources/road/lot.png",
            east:"resources/road/lotCornerEast.png",
            west:"resources/road/lotCornerWest.png",
            north:"resources/road/lotCornerNorth.png",
            south:"resources/road/lotCornerSouth.png",
            actor:"resources/dwarf.png"

        },
        texture_minimap_colors:{
            dirt:0xBA793F,
            grass:0x37D622,
            lot:0x4D4D4D
        },
        texture_index:['dirt', 'grass', 'lot']
    },
    textures:[],
    tiles:[],
    uiParent:null,
    tileParent:null,
    actorParent:null,
    sprites:[],
    controls:[],
    actors:[],
    highlightedTile:null,
    viewOrigin:{x:0, y:0},
    minimap:null,
    minimap_tile_size: 0,
    minimap_widget:null,
    text:{
        fps:null,
        // click:null,
        viewport:null
    },
    sidebar:{
        texture:null,
        list:null,
        log:null,
        actorList:null,
        actorClone:null
    },
    loadUI:{
        generate:null,
        load:null
    },
    stage_events:{
        select_tile:null,
        add_actor:null,
        move_actor:null
    },
    stage_buttons:{
        select_tile:null,
        add_actor:null,
        move_actor:null
    },
    time:0,
    frame_count:0,
    stage:null,
    renderer:null,
    paused:true,
    init:function(options){

        // First, checks if it isn't implemented yet.
        if (!String.prototype.format) {
            String.prototype.format = function() {
                var args = arguments;
                return this.replace(/{(\d+)}/g, function(match, number) {
                    return typeof args[number] != 'undefined'
                        ? args[number]
                        : match
                        ;
                });
            };
        }

        // external UI elements
        this.sidebar.texture = $('#sidebar .texture');
        this.sidebar.list = $('#sidebar ul');
        this.sidebar.log = $('#log');
        this.sidebar.actorList = $('#actor-list');
        this.sidebar.actorClone = $('#actor-clone');


        Generator.lib.logMessage('Starting');

        // extend options
        $.extend(this.options, {}, options);


        // load textures
        for(var key in this.options.texture_paths){
            this.textures[key] = PIXI.Texture.fromImage(this.options.texture_paths[key]);
        }

        // create an new instance of a pixi stage
        this.stage = new PIXI.Stage(0x66FF99, true);
        this.stage.interactive = true;

        //ui parents
        this.uiParent = new PIXI.DisplayObjectContainer();
        this.uiParent.width = this.options.canvas_width;
        this.uiParent.height = this.options.canvas_height;
        this.uiParent.interactive = true;
        this.stage.addChild(this.uiParent);

        //tile parents
        this.tileParent = new PIXI.DisplayObjectContainer();
        this.tileParent.width = this.options.canvas_width;
        this.tileParent.height = this.options.canvas_height;
        this.tileParent.interactive = true;
        this.stage.addChild(this.tileParent);

        //actor parent
        this.actorParent = new PIXI.DisplayObjectContainer();
        this.actorParent.width = this.options.canvas_width;
        this.actorParent.height = this.options.canvas_height;
        this.actorParent.position = new PIXI.Point(this.options.offset_x, this.options.offset_y);
        this.stage.addChild(this.actorParent);

        //text
        this.text.fps = new PIXI.Text("-", {font:"26px Arial", fill:"black"});
        this.text.fps.position = new PIXI.Point(10,10);
        var rect = this.lib.getViewRect();
        this.text.viewport = new PIXI.Text("", {font:"26px Arial", fill:"black"});
        this.text.viewport.position = new PIXI.Point(10, 40);

        // configure selection events
        this.stage_events.select_tile = function(data){
            if(Generator.tiles.length == 0){
                return;
            }
            var pos = data.getLocalPosition(this);
            var tile = Generator.lib.isometricToOrtho(pos.x, pos.y,
                Generator.options.tile_half_x,
                Generator.options.tile_half_y,
                Generator.options.offset_x,
                Generator.options.offset_y,
                Generator.options.sprite_anchor);
            if(tile.x > -1 && tile.y > -1 && tile.x < Generator.options.tile_count_x && tile.y < Generator.options.tile_count_y){
                this.highlightedTile = Generator.tiles[tile.x][tile.y];
                //Generator.actors[0].addDestination(tile.x, tile.y);
                Generator.lib.logMessage("Selected: (" + tile.x + ", " + tile.y + ")");
                Generator.lib.updateSelectedTile(this.highlightedTile);
            }
        };

        this.stage_events.move_actor = function(data){
            if(Generator.tiles.length == 0){
                return;
            }
            var pos = data.getLocalPosition(this);
            var tile = Generator.lib.isometricToOrtho(pos.x, pos.y,
                Generator.options.tile_half_x,
                Generator.options.tile_half_y,
                Generator.options.offset_x,
                Generator.options.offset_y,
                Generator.options.sprite_anchor);
            if(tile.x > -1 && tile.y > -1 && tile.x < Generator.options.tile_count_x && tile.y < Generator.options.tile_count_y){
                this.highlightedTile = Generator.tiles[tile.x][tile.y];

                var available_actors = [];
                for(var i in Generator.actors){
                    var actor = Generator.actors[i];
                    if(actor.state == 'resting'){
                        available_actors.push(actor);
                    }
                }

                if(available_actors.length > 0){
                    var index = Math.floor(Math.random() * available_actors.length);
                    available_actors[index].addDestination(tile.x, tile.y);
                }else{

                }

                Generator.lib.logMessage("Selected: (" + tile.x + ", " + tile.y + ")");
                Generator.lib.updateSelectedTile(this.highlightedTile);
            }
        };

        this.stage_events.add_actor = function(data){
            if(Generator.tiles.length == 0){
                return;
            }
            var pos = data.getLocalPosition(this);
            var tile = Generator.lib.isometricToOrtho(pos.x, pos.y,
                Generator.options.tile_half_x,
                Generator.options.tile_half_y,
                Generator.options.offset_x,
                Generator.options.offset_y,
                Generator.options.sprite_anchor);
            if(tile.x > -1 && tile.y > -1 && tile.x < Generator.options.tile_count_x && tile.y < Generator.options.tile_count_y){
                this.highlightedTile = Generator.tiles[tile.x][tile.y];
                //Generator.actors[0].addDestination(tile.x, tile.y);
                Generator.lib.logMessage("Selected: (" + tile.x + ", " + tile.y + ")");
                Generator.lib.updateSelectedTile(this.highlightedTile);

                Generator.lib.addActorOnTile(tile.x, tile.y);
            }
        };

        // set up buttons to toggle UI interactivity state
        Generator.stage_buttons.select_tile = this.ui.makeGraphicsControl('Select', function(){
            Generator.ui.setStageInteracton('select_tile');
        }, new PIXI.Rectangle(0, 0, 150, 35));

        Generator.stage_buttons.move_actor = this.ui.makeGraphicsControl('Move', function(){
            Generator.ui.setStageInteracton('move_actor');
        }, new PIXI.Rectangle(0, 0, 150, 35));

        Generator.stage_buttons.add_actor = this.ui.makeGraphicsControl('Add', function(){
            Generator.ui.setStageInteracton('add_actor');
        }, new PIXI.Rectangle(0, 0, 150, 35));

        Generator.stage_buttons.add_actor.position = new PIXI.Point(800, 100);
        Generator.stage_buttons.move_actor.position = new PIXI.Point(800, 55);
        Generator.stage_buttons.select_tile.position = new PIXI.Point(800, 10);

        this.uiParent.addChild(Generator.stage_buttons.select_tile);
        this.uiParent.addChild(Generator.stage_buttons.move_actor);
        this.uiParent.addChild(Generator.stage_buttons.add_actor);

        // add children to stage
        for(var text_label in this.text){
            this.stage.addChild(this.text[text_label]);
        }

        this.controls = this.ui.makeMiniMapControls();
        for(var control in this.controls){
            this.stage.addChild(this.controls[control]);
        }

        this.renderer = PIXI.autoDetectRenderer(this.options.canvas_width, this.options.canvas_height);

        $('#stage').append(this.renderer.view);

        this.time = Date.now();

        this.loadUI.generate = this.ui.makeGraphicsControl('Generate World', function(){
            Generator.generateAndDisplayTiles();

        }, new PIXI.Rectangle(0,0,300,50));

        this.loadUI.load = this.ui.makeGraphicsControl('Load World', function(){
            $('#dialog').dialog({
                modal: true,
                minWidth: 650,
                buttons: {
                    close: function() {
                        $( this ).dialog( "close" );
                    }
                }
            });
        }, new PIXI.Rectangle(0,0,300,50));

        this.loadUI.generate.position = new PIXI.Point(300, 200);
        this.loadUI.load.position = new PIXI.Point(300, 270);

        this.uiParent.addChild(this.loadUI.generate);
        this.uiParent.addChild(this.loadUI.load);

        this.ui.setStageInteracton('select_tile');

        // set up renderer
        requestAnimFrame(this.lib.animate);
    },
    generateAndDisplayTiles:function(){
        Generator.lib.logMessage('Generating World');
        Generator.tiles = Generator.lib.generateTiles(this.options, this.tileParent);

        // make minimap
        Generator.minimap_tile_size = Generator.options.minimap_size / Generator.options.tile_count_x;
        Generator.minimap_widget = Generator.ui.generateMinimapWidget(Generator.minimap_tile_size, Generator.options);
        Generator.minimap = Generator.ui.generateMinimap(Generator.options, Generator.tiles, Generator.minimap_tile_size, Generator.minimap_widget);
        Generator.stage.addChild(Generator.minimap);

        Generator.paused = false;
        Generator.lib.shiftView(-10,-10);
        Generator.time = Date.now();

        Generator.lib.addActorOnTile(15,15);

        Generator.uiParent.removeChild(Generator.loadUI.generate);
        Generator.uiParent.removeChild(Generator.loadUI.load);
        requestAnimFrame(this.lib.animate);
    },
    loadAndDisplayTiles:function(world_id){
        Generator.lib.logMessage('Loading: ' + world_id);

        var tile_json = localStorage[world_id];
        Generator.tiles = Generator.lib.loadTiles(Generator.options, Generator.tileParent, tile_json);

        // make minimap
        Generator.minimap_tile_size = Generator.options.minimap_size / Generator.options.tile_count_x;
        Generator.minimap_widget = Generator.ui.generateMinimapWidget(Generator.minimap_tile_size, Generator.options);
        Generator.minimap = Generator.ui.generateMinimap(Generator.options, Generator.tiles, Generator.minimap_tile_size, Generator.minimap_widget);
        Generator.stage.addChild(Generator.minimap);

        Generator.lib.addActorOnTile(15, 15);

        Generator.paused = false;
        Generator.lib.shiftView(-10,-10);
        Generator.time = Date.now();

        Generator.uiParent.removeChild(Generator.loadUI.generate);
        Generator.uiParent.removeChild(Generator.loadUI.load);
        requestAnimFrame(this.lib.animate);
    },
    obj:{
        Tile:function(options, texture_def, x, y){
            this.sprite = Generator.lib.spriteFactory(options, Generator.textures[texture_def], x, y);
            this.texture_def = texture_def;
            this.x = x;
            this.y = y;
        }
    },
    ui:{
        setStageInteracton: function(function_name){
            if($.inArray(function_name, Generator.stage_events)){
                Generator.lib.logMessage('State: ' + function_name);
                Generator.tileParent.mousedown = Generator.tileParent.touchstart = Generator.stage_events[function_name];
                for(var button_type in Generator.stage_buttons){
                    if(Generator.stage_buttons[button_type] != null){
                        Generator.stage_buttons[button_type].scale = new PIXI.Point(0.95, 0.95);
                    }
                }
                Generator.stage_buttons[function_name].scale = new PIXI.Point(1, 1);
            }
        },
        makeGraphicsControl:function(label, action, rect, font){
            if(font == undefined){
                font = { font: "bold 20px Arial" };
            }

            var control = new PIXI.Graphics();
            control.bounds = rect;
            control.interactive = true;
            control.mousedown = control.touchend = function(data){
                action(data);
                control.alpha = 0.5;
            };
            control.mouseup = control.mouseout = control.touchend = control.touchendoutside = function(){
                control.alpha = 1.0;
            };

            control.lineStyle(1, 0x000000, 0.5);
            control.beginFill(0x000000, 0.2);
            control.drawRect(2, 2, rect.width -2, rect.height-2);
            control.endFill();

            control.buttonMode = true;
            control.hitArea = rect;

            var text = new PIXI.Text(label, font);
            control.addChild(text);
            text.position = new PIXI.Point(
                (rect.width - text.width) / 2,
                (rect.height - text.height) / 2
            );
            control.text = text;
            return control;
        },
        makeMiniMapControls:function(){
            //controls
            var control_bounds = new PIXI.Rectangle(0,0,50,25);
            var font = { font: "bold 14px Arial" };
            var controls = [];
            controls['north'] = Generator.ui.makeGraphicsControl('north',
                function(data){
                    Generator.lib.shiftView(0, 1);
                },
                control_bounds, font);
            controls['north'].x = 750;
            controls['north'].y = 410;

            controls['west'] = Generator.ui.makeGraphicsControl('west',  function(data){
                Generator.lib.shiftView(1, 0);
            }, control_bounds, font);
            controls['west'].x = 715;
            controls['west'].y = 440;

            controls['east'] = Generator.ui.makeGraphicsControl('east',  function(data){
                Generator.lib.shiftView(-1, 0);
            },  control_bounds, font);
            controls['east'].x = 785;
            controls['east'].y = 440;

            controls['south'] = Generator.ui.makeGraphicsControl('south',  function(data){
                Generator.lib.shiftView(0, -1);
            },  control_bounds, font);
            controls['south'].x = 750;
            controls['south'].y = 470;

            return controls;
        },
        generateMinimap:function(options, tiles, minimap_tile_size, widget){
            //configure minimap
            var minimap = new PIXI.Graphics();
            minimap.lineStyle(1, 0x000000, 1);
            minimap.drawRect(-1, -1, options.minimap_size+1, options.minimap_size+1);
            minimap.position = new PIXI.Point(options.canvas_width - options.minimap_size -1,
                                            options.canvas_height - options.minimap_size -1);
            minimap.lineStyle(0, 0x000000, 0);

            for(var col in tiles){
                for(var tile_index in tiles[col]){
                    var tile = tiles[col][tile_index];
                    var color = options.texture_minimap_colors[tile.texture_def];
                    minimap.beginFill(color, 1);
                    minimap.drawRect(tile.x * minimap_tile_size,
                        tile.y * minimap_tile_size,
                        minimap_tile_size,
                        minimap_tile_size);
                    minimap.endFill();
                }
            }
            minimap.addChild(widget);

            return minimap;
        },
        generateMinimapWidget: function(minimap_tile_size, options){
            //configure selected area on minimap
            var minimap_widget = new PIXI.Graphics();
            minimap_widget.lineStyle(1, 0x000000, 0.5);
            minimap_widget.beginFill(0x000000, 0.2);
            minimap_widget.drawRect(0,
                0,
                minimap_tile_size * options.view_tc_width,
                minimap_tile_size * options.view_tc_height);
            minimap_widget.endFill();
            return minimap_widget;
        },
        makeActorStatus:function(name, status, id, texture_path){
            var clone = Generator.sidebar.actorClone.clone();
            clone.prop('id', id);
            clone.find('.sprite').prop('src', texture_path);
            clone.find('.name').html(name);
            clone.find('.status').html(status);
            Generator.sidebar.actorList.append(clone);
            return clone;
        }
    },
    lib:{
        shiftView:function(x, y){
            if(Generator.paused){
                return;
            }
            var shift = Generator.lib.orthoToIsometric(x , y, Generator.options.tile_half_x , Generator.options.tile_half_y, 0, 0 );


            Generator.tileParent.position.x +=  shift.x;
            Generator.tileParent.position.y +=  shift.y;

            Generator.actorParent.position.x +=  shift.x;
            Generator.actorParent.position.y +=  shift.y;

            Generator.viewOrigin.x -= x;
            Generator.viewOrigin.y -= y;

            for(var col in Generator.tiles){
                for(var tile_index in Generator.tiles[col]){
                    var tile = Generator.tiles[col][tile_index];

                    var rect = Generator.lib.getViewRect();

                    if(tile.x > rect.x1 &&  tile.x < rect.x2 &&  tile.y > rect.y1 && tile.y < rect.y2){
                        tile.sprite.alpha = 1;
                        tile.sprite.visible = true;
                    }else if(((tile.x == rect.x1 || tile.x == rect.x2) && (tile.y >= rect.y1 && tile.y <= rect.y2)) ||
                        ((tile.y == rect.y1 || tile.y == rect.y2) && (tile.x >= rect.x1 && tile.x <= rect.x2))){
                        tile.sprite.alpha = 0.25;
                        tile.sprite.visible = true;

                    }else{
                        tile.sprite.alpha = 0;
                        tile.sprite.visible = false;
                    }
                }
            }

            for(var actor_index in Generator.actors){
                Generator.actors[actor_index].updateAlphaForViewRect(rect);
            }

            Generator.minimap_widget.position = new PIXI.Point(rect.x1 * Generator.minimap_tile_size,
                                                            rect.y1 * Generator.minimap_tile_size);
            Generator.text.viewport.setText("({0}, {1}, {2}, {3} )".format(rect.x1, rect.x2, rect.y1, rect.y2));
            Generator.lib.logMessage("View port: ({0}, {1}, {2}, {3} )".format(rect.x1, rect.x2, rect.y1, rect.y2));

        },
        getViewRect:function(){
            return {x1:Generator.viewOrigin.x,
                x2:Generator.viewOrigin.x + Generator.options.view_tc_width,
                y1:Generator.viewOrigin.y,
                y2:Generator.viewOrigin.y + Generator.options.view_tc_height};
        },
        loadTiles:function(options, stage, tileJSON){
            var tile_def = JSON.parse(tileJSON);
            var tiles = [];
            for(var x in tile_def){
                var col = [];
                for(var y in tile_def[x]){
                    var tile = new Generator.obj.Tile(options, tile_def[x][y], parseInt(x), parseInt(y));
                    stage.addChild(tile.sprite);
                    col[y] = tile;
                }
                tiles[x] = col;
            }
            return tiles;

        },
        generateTiles:function(options, stage){
            var tiles = [];
            var tile_storage = [];
            for(var x = 0; x < options.tile_count_x; x++){
                var col = [];
                var col_storage = [];
                for (var y = 0; y < options.tile_count_y; y++){
                    var weight_y = y / options.tile_count_y;
                    var weight_x = x / options.tile_count_x;

                    var grass_weight = 2;

                    var total = grass_weight + weight_y + weight_x;
                    var index;
                    var rnd = Math.random() * total;
                    if(rnd < grass_weight){
                        index = 1;
                    }else if(rnd < grass_weight + weight_y){
                        index = 0;
                    }else{
                        index = 2;
                    }

                    var tile = new Generator.obj.Tile(options, options.texture_index[index], x, y);
                    col_storage[y] = options.texture_index[index];
                    col[y] = tile;
                    stage.addChild(tile.sprite);
                }
                tiles[x] = col;
                tile_storage[x] = col_storage;
            }

            var saved_tiles = JSON.stringify(tile_storage);
            var time = Date.now();
            localStorage.setItem(time, saved_tiles);
            Generator.lib.logMessage('Saved Tiles as {0}'.format(time));

            return tiles;
        },
        spriteFactory:function(options, texture, x, y){
            var sprite = new PIXI.Sprite(texture);
            // center the sprites anchor point
            sprite.anchor.x = options.sprite_anchor;
            sprite.anchor.y = options.sprite_anchor;

            sprite.position = Generator.lib.orthoToIsometric(x, y,
                options.tile_half_x,
                options.tile_half_y,
                options.offset_x,
                options.offset_y);

            sprite.scale = new PIXI.Point(options.tile_base_scale, options.tile_base_scale);

            return sprite;
        },
        orthoToIsometric: function (x, y, half_width, half_height, offset_x, offset_y) {
            var u = (x - y) * half_width + offset_x;
            var v = (x + y) * half_height + offset_y;
            var w = x + y;
            return new PIXI.Point(u, v);
        },
        isometricToOrtho: function (u, v, half_width, half_height, offset_x, offset_y, sprite_anchor) {
            var _u = (u - offset_x) / half_width;
            var _v = (v - offset_y ) / half_height;

            var x = Math.floor(((_u + _v ) / 2) + sprite_anchor);
            var y = Math.floor(((_v - _u ) / 2) + sprite_anchor);
            return {x: x, y: y};
        },
        animate: function() {
            var diff = (Date.now() - Generator.time) / 1000;

            if(Generator.frame_count % 10 == 0){
                Generator.text.fps.setText(Math.round(1 / diff) + ' fps');
            }

            for(var actor_index in Generator.actors){
                Generator.actors[actor_index].update(diff);
            }

            // render the stage
            Generator.renderer.render(Generator.stage);
            Generator.time = Date.now();
            Generator.frame_count++;

            if(!Generator.paused)
                requestAnimFrame(Generator.lib.animate);

        },
        logMessage: function(message){
            Generator.sidebar.log.append('<div> [' + Date.now() + '] ' + message + '</div>');
            Generator.sidebar.log.scrollTop(Generator.sidebar.log.prop("scrollHeight"));

        },
        updateSelectedTile: function(tile){
            Generator.sidebar.texture.prop('src', Generator.options.texture_paths[tile.texture_def]);
            Generator.sidebar.list.empty();
            Generator.sidebar.list.append('<li>{0}</li>'.format(tile.texture_def));
            Generator.sidebar.list.append('<li>x:{0}, y:{1}</li>'.format(tile.x, tile.y));

        },
        calculatePath: function(start, end){
            var path = [];

            if(end.x < 0 || end.y < 0 || end.x > Generator.options.tile_count_x || end.y > Generator.options.tile_count_y){
                Generator.lib.logMessage('Error: invalid path');
                return new Array(start);
            }

            if(start.x == end.x && start.y == end.y){
                return new Array(start);
            }

            var last_point = new PIXI.Point(start.x, start.y);
            var i = 0;
            var message = 'Path: ';
            while(true){
                if(++i > 50){
                    Generator.lib.logMessage('Error: path overflow');
                    return new Array(start);
                }
                if(last_point.x == end.x && last_point.y == end.y){
                    break;
                }
                var x = last_point.x;
                var y = last_point.y;
                if(end.x > last_point.x){
                    x++;
                }else if(end.x < last_point.x){
                    x--;
                }

                if(end.y > last_point.y){
                    y++;
                }else if(end.y < last_point.y){
                    y--;
                }
                last_point = new PIXI.Point(x, y);
                message += '({0}, {1}) '.format(last_point.x, last_point.y);
                path.push(last_point);

            }
            Generator.lib.logMessage(message);
            return path;
        },
        addActorOnTile:function(x, y){
            //actors
            var actor_sprite = new PIXI.Sprite(Generator.textures['actor']);
            actor_sprite.anchor = new PIXI.Point(Generator.options.sprite_anchor, 1);
            actor_sprite.scale = new PIXI.Point(0.08, 0.08);
            var actor = new Actor(x, y, actor_sprite);
            actor.id = Date.now();
            actor.statusUI = Generator.ui.makeActorStatus(actor.id, actor.getStatusString(), actor.id, Generator.options.texture_paths['actor']);;

            Generator.actors.push(actor);
            Generator.actorParent.addChild(actor_sprite);



        }
    }
};
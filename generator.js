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
        log:null
    },
    time:0,
    frame_count:0,
    stage:null,
    renderer:null,
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

        // extend options
        $.extend(this.options, {}, options);

        Generator.lib.logMessage('Starting');

        // load textures
        for(var key in this.options.texture_paths){
            this.textures[key] = PIXI.Texture.fromImage(this.options.texture_paths[key]);
        }

        // create an new instance of a pixi stage
        this.stage = new PIXI.Stage(0x66FF99, true);
        this.stage.interactive = true;

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

        //actors
        var actor_sprite = new PIXI.Sprite(this.textures['actor']);
        actor_sprite.anchor = new PIXI.Point(this.options.sprite_anchor, 1);
        actor_sprite.scale = new PIXI.Point(0.08, 0.08);
        this.actors.push(new Actor(1, 1, actor_sprite));
        this.actorParent.addChild(actor_sprite);

        //tiles
        this.tiles = this.lib.generateTiles(this.options, this.tileParent);


        //text
        this.text.fps = new PIXI.Text("-", {font:"26px Arial", fill:"black"});
        var rect = this.lib.getViewRect();
        this.text.viewport = new PIXI.Text("", {font:"26px Arial", fill:"black"});
        this.text.viewport.position.y = 30;

        //controls
        this.controls['north'] = new PIXI.Sprite(this.textures.dirt);
        this.controls['north'].shift = {x:0, y:-1};
        this.controls['north'].x = 92;
        this.controls['north'].y = 400;

        this.controls['west'] = new PIXI.Sprite(this.textures.dirt);
        this.controls['west'].shift = {x:-1, y:0};
        this.controls['west'].x = 50;
        this.controls['west'].y = 400;

        this.controls['east'] = new PIXI.Sprite(this.textures.dirt);
        this.controls['east'].shift = {x:1, y:0};
        this.controls['east'].x = 92;
        this.controls['east'].y = 425;

        this.controls['south'] = new PIXI.Sprite(this.textures.dirt);
        this.controls['south'].shift = {x:0, y:1};
        this.controls['south'].x = 50;
        this.controls['south'].y = 425;

        for(var ctrl in this.controls){
            this.controls[ctrl].interactive = true;
            this.controls[ctrl].name = ctrl;
            this.controls[ctrl].scale = new PIXI.Point(0.4, 0.4);
            this.controls[ctrl].mousedown = this.controls[ctrl].touchstart =  function(data){
                Generator.lib.shiftView(this.shift.x, this.shift.y);

                this.alpha = 0.75;
            };
            this.controls[ctrl].mouseup = this.controls[ctrl].touchend = this.controls[ctrl].touchendoutside =  this.controls[ctrl].mouseout = function(data){
                this.alpha = 1;
            };
        }

        //configure minimap
        this.minimap = new PIXI.Graphics();
        this.minimap.lineStyle(1, 0x000000, 1);
        this.minimap.drawRect(-1, -1, this.options.minimap_size+1, this.options.minimap_size+1);
        this.minimap.position = new PIXI.Point(this.options.canvas_width - this.options.minimap_size -1,
            this.options.canvas_height - Generator.options.minimap_size -1);
        this.minimap.lineStyle(0, 0x000000, 0);

        this.minimap_tile_size = this.options.minimap_size / this.options.tile_count_x;
        for(var col in this.tiles){
            for(var tile_index in this.tiles[col]){
                var tile = this.tiles[col][tile_index];
                var color = this.options.texture_minimap_colors[tile.texture_def];
                this.minimap.beginFill(color, 1);
                this.minimap.drawRect(tile.x * this.minimap_tile_size,
                    tile.y * this.minimap_tile_size,
                    this.minimap_tile_size,
                    this.minimap_tile_size);
                this.minimap.endFill();
            }
        }

        //configure selected area on minimap
        this.minimap_widget = new PIXI.Graphics();
        this.minimap_widget.lineStyle(1, 0x000000, 0.5);
        this.minimap_widget.beginFill(0x000000, 0.2);
        this.minimap_widget.drawRect(0,
            0,
            this.minimap_tile_size * this.options.view_tc_width,
            this.minimap_tile_size * this.options.view_tc_height);
        this.minimap_widget.endFill();
        this.minimap.addChild(this.minimap_widget);

        // configure selection events
        this.tileParent.mousedown = this.tileParent.touchstart = function(data){
            var pos = data.getLocalPosition(this);
            var tile = Generator.lib.isometricToOrtho(pos.x, pos.y,
                Generator.options.tile_half_x,
                Generator.options.tile_half_y,
                Generator.options.offset_x,
                Generator.options.offset_y,
                Generator.options.sprite_anchor);
            if(tile.x > -1 && tile.y > -1 && tile.x < Generator.options.tile_count_x && tile.y < Generator.options.tile_count_y){
                // Generator.text.click.setText('x: ' + tile.x + ' y:' + tile.y);

                this.highlightedTile = Generator.tiles[tile.x][tile.y];
                Generator.actors[0].addDestination(tile.x, tile.y);
                Generator.lib.logMessage("Selected: (" + tile.x + ", " + tile.y + ")");
                Generator.lib.updateSelectedTile(this.highlightedTile);
            }
        };

        // add children to stage
        for(var text_label in this.text){
            this.stage.addChild(this.text[text_label]);
        }

        for(var control in this.controls){
            this.stage.addChild(this.controls[control]);
        }
        this.stage.addChild(this.minimap);

        this.renderer = PIXI.autoDetectRenderer(this.options.canvas_width, this.options.canvas_height);

        // add the renderer view element to the DOM
        //document.body.appendChild(this.renderer.view);
        $('#stage').append(this.renderer.view);

        this.time = Date.now();

        this.lib.shiftView(0,0);

        // set up renderer
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
    lib:{
        shiftView:function(x, y){
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
        generateTiles:function(options, stage){
            var tiles = [];
            for(var x = 0; x < options.tile_count_x; x++){
                var col = [];
                for (var y = 0; y < options.tile_count_y; y++){
                    var index = Math.floor(Math.random() * 3);
                    var tile = new Generator.obj.Tile(options, Generator.options.texture_index[index], x, y);
                    col[y] = tile;
                    stage.addChild(tile.sprite);
                }
                tiles[x] = col;
            }
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
            return {x: u, y: v, z: w};
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
        }
    }
};
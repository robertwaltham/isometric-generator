function Tile(x, y, texture, texture_def, options){
    PIXI.DisplayObjectContainer.call(this);

    this.setPosition(x, y);
    this.texture_def = texture_def;
    this.sprite = new PIXI.Sprite(texture);
    // center the sprites anchor point
    this.sprite.anchor.x = options.sprite_anchor;
    this.sprite.anchor.y = options.sprite_anchor;
    this.sprite.scale = new PIXI.Point(options.tile_base_scale, options.tile_base_scale);
    this.addChild(this.sprite);

}

Tile.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
Tile.prototype.constructor = Tile;
Tile.prototype.sprite = null;
Tile.prototype.position = null;
Tile.prototype.texture_def = null;
Tile.prototype.tilePosition = null;

Tile.prototype.update = function(time){

};


Tile.prototype.updateAlphaForViewRect = function(rect){
    if(this.tilePosition.x > rect.x1 &&  this.tilePosition.x < rect.x2 &&  this.tilePosition.y > rect.y1 && this.tilePosition.y < rect.y2){
        this.alpha = 1;
        this.visible = true;
    }else if(((this.tilePosition.x == rect.x1 || this.tilePosition.x == rect.x2) && (this.tilePosition.y >= rect.y1 && this.tilePosition.y <= rect.y2)) ||
        ((this.tilePosition.y == rect.y1 || this.tilePosition.y == rect.y2) && (this.tilePosition.x >= rect.x1 && this.tilePosition.x <= rect.x2))){
        this.alpha = 0.25;
        this.visible = true;
    }else{
        this.alpha = 0;
        this.visible = false;
    }
};

Tile.prototype.setPosition = function(x, y){
    this.tilePosition = new PIXI.Point(x, y);
    this.position = Generator.lib.orthoToIsometric(x, y,
        Generator.options.tile_half_x,
        Generator.options.tile_half_y,
        Generator.options.offset_x,
        Generator.options.offset_y);

};
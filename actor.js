
function Actor(x, y, sprite){
    this.position = new PIXI.Point(x, y);
    this.sprite = sprite;
    this.setPosition(x, y);
}

Actor.prototype.update = function(time){};
Actor.prototype.sprite = null;
Actor.prototype.position = null;
Actor.prototype.setPosition = function(x, y){

}
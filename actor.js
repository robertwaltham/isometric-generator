
function Actor(x, y, sprite){
    this.sprite = sprite;
    this.setPosition(x, y);
    this.position = new PIXI.Point(x, y);
}

Actor.prototype.update = function(time){
    this.count += time;

    if(this.count > 5){
        this.addDestination(Generator.viewOrigin.x +1, Generator.viewOrigin.y +1);
        if(this.path != null){
            Generator.lib.logMessage('{0} Going back to origin'.format(this.name));
        }
    }

    if(this.path != null && this.next != null){
        if(this.count > this.speed){
            this.setPosition(this.next.x, this.next.y);
            this.position = new PIXI.Point(this.next.x, this.next.y);
            this.updateAlphaForViewRect(Generator.lib.getViewRect());

            if(this.path.length == 0){
                Generator.lib.logMessage('{0} arrived at ({1}, {2})'.format(this.name, this.next.x, this.next.y));
                this.position = new PIXI.Point(this.next.x, this.next.y);
                this.path = null;
                this.next = null;
                this.state = 'resting';

            }else{
                this.next = this.path.shift();
                this.count = 0;
                this.state = 'waiting';
            }
        }else if(this.count > (this.speed / 2)){

            var diff = (this.count - (this.speed / 2)) / (this.speed / 2);
            var interp = new PIXI.Point(this.position.x, this.position.y);

            if(this.next.x > this.position.x){
                interp.x += diff;
            }else if(this.next.x < this.position.x){
                interp.x -= diff;
            }

            if(this.next.y > this.position.y){
                interp.y += diff;
            }else if(this.next.y < this.position.y){
                interp.y -= diff;
            }

            this.setPosition(interp.x , interp.y);

            this.state = 'moving';
        }

    }

};
Actor.prototype.sprite = null;
Actor.prototype.position = null;
Actor.prototype.count = 0;
Actor.prototype.path = null;
Actor.prototype.state = null;
Actor.prototype.next = null;
Actor.prototype.speed = 0.5;
Actor.prototype.name = 'Actor';
Actor.prototype.setPosition = function(x, y){

    var position = Generator.lib.orthoToIsometric(x, y, Generator.options.tile_half_x, Generator.options.tile_half_y, 0, 0);
    this.sprite.position = new PIXI.Point(position.x, position.y);

};
Actor.prototype.addDestination = function(x, y){

    var path;
    if (this.next != null) {
        path = Generator.lib.calculatePath(this.next, new PIXI.Point(x, y));
    } else {
        path = Generator.lib.calculatePath(this.position, new PIXI.Point(x, y));
    }

    if(path.length != 0){
        this.count = 0;
        this.path = path;
        if(this.next == null){
            this.next = this.path.shift();
        }
    }
};

Actor.prototype.updateAlphaForViewRect = function(rect){
    if(this.position.x > rect.x1 &&  this.position.x < rect.x2 &&  this.position.y > rect.y1 && this.position.y < rect.y2){
        this.sprite.alpha = 1;
        this.sprite.visible = true;
    }else if(((this.position.x == rect.x1 || this.position.x == rect.x2) && (this.position.y >= rect.y1 && this.position.y <= rect.y2)) ||
        ((this.position.y == rect.y1 || this.position.y == rect.y2) && (this.position.x >= rect.x1 && this.position.x <= rect.x2))){
        this.sprite.alpha = 0.25;
        this.sprite.visible = true;

    }else{
        this.sprite.alpha = 0;
        this.sprite.visible = false;
    }
}
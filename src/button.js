/**
 * Created with JetBrains WebStorm.
 * User: anthonycosgrave
 * Date: 19/06/2013
 * Time: 10:26
 * To change this template use File | Settings | File Templates.
 */
/**
 *
 * @param text
 * @param x
 * @param y
 * @param width
 * @param height
 * @constructor
 */
function Button(id, text, x, y, width, height, colour, touched)
{
	this.id = id;
	this.text = text;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.colour = colour;
	this.touched = touched;
	this.buildHitBox();
};

Button.prototype.buildHitBox = function()
{
	this.hitX = this.x;
	this.hitY = this.y - (this.height/2);
	this.hitWidth = this.width + (this.width/2);
	this.hitHeight = this.height;
};

Button.prototype.update = function()
{
	// strobe or animate...
};

Button.prototype.render = function()
{
	if (this.id === 'PAUSE')
	{
		myGlobal.writeText(this.text, 26, '#FFF', this.x + (this.width/2), this.y);
	}
	else
	{
		myGlobal.writeText(this.text, 40, '#FFF', this.x + (this.width/2), this.y);
	}
};


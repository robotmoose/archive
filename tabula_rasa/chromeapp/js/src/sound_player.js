// Arsh Chauhan
// 06/15/2016
// Last Edited 06/17/2016
// sound_player.js: Play sounds on robot via chromeapp backend
// Public Domain 

// DO NOT REMOVE THIS COPYRIGHT NOTICE
// This code uses these sounds from freesound:
// 	1) Bicycle horn (https://www.freesound.org/people/AntumDeluge/sounds/188039/) 
// 		by AntumDeluge (https://www.freesound.org/people/AntumDeluge/)


function sound_player_t(name)
{
	if(!name)
		return null; 

	var _this=this;
	this.name=name;
	this.sounds=
	[
		{name:"bike horn",audio:new Audio("https://robotmoose.com/downloads/files/bike_horn.wav")},
		{name:"dummy",audio:new Audio("https://robotmoose.com/downloads/files/bike_horn.wav")}
	];

	this.sound_requested="";
	this.path="run";

	this.no_send=false;

	this.update_interval=setInterval(function(){_this.update()},5000);
	this.play=false;

}

sound_player_t.prototype.send_sounds=function()
{
	if (!this.no_send)
	{
		console.log("In get_sounds");
		var sound_list=[];
		for(index in this.sounds)
		{
			sound_list.push(this.sounds[index].name);
		}
		console.log(sound_list)
		this.no_send=true; //Stupid testing hack to send only once
		superstar_set(this.name.get_robot(),this.path,{"options":sound_list});
	}
}


sound_player_t.prototype.play_sound=function(sound)
{
	try
	{
		if (sound.readyState==="HAVE_ENOUGH_DATA" || sound.readyState==4)
		{
			sound.play();
		}
	}
	catch(e)
	{
		console.log("Could not play sound "+ sound + " " + e);
	}
}

sound_player_t.prototype.handle_update=function(json)
{

	this.sound_requested=json["sound"];
	this.play=json["play"];
	
	if(this.play) //We received a request to play sound
	{
		for (index in this.sounds)
		{
			if(this.sounds[index].name===this.sound_requested)
				this.play_sound(this.sounds[index].audio);
		}
	}
}

sound_player_t.prototype.update=function()
{
	var robot=this.name.get_robot();
	var _this=this;

	if(robot&&robot.name&&robot.superstar&&robot.year&&robot.school&&robot.name)
		superstar_get(robot,this.path,function(json){_this.handle_update(json);});
}

sound_player_t.prototype.destroy=function()
{
	clearInterval(this.update_interval);
}


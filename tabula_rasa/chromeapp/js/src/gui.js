function gui_t(div)
{
	if(!div)
		return null;

	this.main_div=document.createElement("div");
	maximize(this.main_div);

	var _this=this;

	this.gruveo_div=document.createElement("div");
	maximize(this.gruveo_div);
	this.gruveo_div.style.overflow="hidden";
	this.gruveo=document.getElementById("gruveo");
	this.gruveo_div.appendChild(gruveo);
	this.gruveo.addEventListener("permissionrequest",function(evt)
	{
		if(evt.permission==="media"||evt.permission==="fullscreen")
			evt.request.allow();
	});

	this.superstar_errored=false;

	var _this=this;

	this.connection=new connection_t
	(
		function(message){_this.status_viewer.show(message);},
		function()
		{
			_this.name.disabled=false;
			_this.serial_selector.disconnect();
		},
		function()
		{
			_this.name.disabled=true;
		}
	);

	this.name=new name_t
	(
		this.main_div,
		function(message){_this.status_viewer.show(message);},
		function(robot)
		{
			_this.connection.gui_robot(robot);
			_this.load_gruveo(robot);
		}

	);
	this.serial_selector=new serial_selector_t
	(
		this.name.el,
		function(port_name)
		{
			_this.connection.gui_connect(port_name);
		},
		function(port_name)
		{
			_this.connection.gui_disconnect(port_name);
		},
		function()
		{
			return (_this.name.get_robot().school!=null&&
				_this.name.get_robot().name!=null&&
				_this.name.get_robot().year!=null);
		}
	);
	this.connection.on_name_set=function(robot)
	{
		_this.name.load(robot);
		_this.serial_selector.load(robot);
	};
	this.connection.load();

	this.status_viewer=new status_viewer_t(this.main_div);
	this.name.el.appendChild(document.createElement("br"));

	this.pilot_checkmark=new checkmark_t(this.name.el);
	this.pilot_status_text=this.pilot_checkmark.getElement();
	this.pilot_status_text.align="center";
	this.pilot_status_text.style.fontSize="x-large";
	this.pilot_status_text.innerHTML="Pilot connected";
	this.name.el.appendChild(document.createElement("br"));

	this.state_side_bar=document.createElement("div");

	$("#content").w2layout
	({
		name:"app_layout",
		panels:
		[
			{type:"left",resizable:true,content:this.gruveo_div,size:"60%"},
			{type:"main",resizable:true,content:this.name.el},
			{type:"preview",resizable:true,content:this.status_viewer.el,size:"55%"}
		]
	});

	this.pilot_status=new pilot_status_t(this.name,this.pilot_checkmark,function()
	{
		_this.load_gruveo(_this.name.get_robot());
	});
	this.gruveo_check=setInterval(function(){

		if(_this.pilot_status.last_video&&!_this.pilot_status.video_closed)
			{
				_this.load_gruveo(_this.name.get_robot());
			}
	},1000);

	this.is_fullscreen=false;
	this.fullscreen_button=document.createElement("input");
	this.serial_selector.el.appendChild(this.fullscreen_button);
	this.fullscreen_button.type="button";
	this.fullscreen_button.value="Enter Fullscreen";
	this.fullscreen_button.style.marginLeft="2px";
	this.fullscreen_button.onclick=function()
	{
		_this.is_fullscreen=!_this.is_fullscreen;

		if(_this.is_fullscreen)
		{
			document.body.webkitRequestFullscreen();
			this.value="Exit Fullscreen Mode";
		}
		else
		{
			document.webkitExitFullscreen();
			this.value="Enter Fullscreen Mode";
		}
	}
	this.fullscreen_button.addEventListener("permissionrequest",function(evt)
	{
		if(evt.permission==="fullscreen")
			evt.request.allow();
	});

	this.sound_player=new sound_player_t(this.name);
	//Sound testing
	this.sound_button=document.createElement("input");
	this.serial_selector.el.appendChild(this.sound_button);
	this.sound_button.type="button";
	this.sound_button.value="Test Sound";
	this.sound_button.style.marginLeft="2px";
	this.sound_button.onclick=function()
	{
		_this.sound_player.send_sounds();
		_this.sound_player.test();
	}
}

gui_t.prototype.destroy=function()
{
	this.connection.destroy();
	this.name.destroy();
	this.status_viewer.destroy();
	this.div.removedChild(this.el);
}

gui_t.prototype.load_gruveo=function(robot)
{
	var url="https://gruveo.com/";
	var robot_url="";
	if(robot&&robot.year&&robot.school&&robot.name)
		robot_url=robot.year+robot.school+robot.name;
	url+=encodeURIComponent(robot_url.replace(/[^A-Za-z0-9\s!?]/g,''));
	this.gruveo.src=url;
}

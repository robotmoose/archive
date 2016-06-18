function chatter_t(div,robot,maxlines,handle)
{
	if(!div||!robot)
		return null;

	this.div=div;
	this.robot=robot;
	this.maxlines=maxlines;
	this.handle=handle;
	var _this=this;

	if(!this.maxlines)
		this.maxlines=10;

	this.div.style.overflow="hidden";

	this.el=document.createElement("div");
	this.div.appendChild(this.el);

	this.table=new_table(this.el,2,1);
	maximize(this.table);
	this.table.rows[1].style.height="0%";

	this.history=document.createElement("textarea");
	this.history.className="form-control";
	this.history.readOnly=true;
	this.history.spellcheck=false;
	this.history.style.resize="none";
	this.history.style.overflow="hidden";
	maximize(this.history);
	this.table.rows[0].cells[0].appendChild(this.history);

	this.el.appendChild(document.createElement("br"));

	this.input=document.createElement("input");
	this.table.rows[1].cells[0].appendChild(this.input);
	this.input.type="text";
	this.input.className="form-control";
	this.input.style.width="100%";
	this.input.spellcheck=false;
	this.input.onkeydown=function(event)
	{
		if(event.keyCode==13)
		{
			_this.chat(this.value);
			this.value="";
		}
	};

	this.create_interval();
}

chatter_t.prototype.destroy=function()
{
	if(this.chat_interval)
		clearInterval(this.chat_interval);
	this.chat_interval=null;
	try
	{
		this.div.removeChild(this.el);
	}
	catch(error)
	{}
	this.div=this.robot=null;
}

chatter_t.prototype.load=function(robot)
{
	this.robot=robot;
}

chatter_t.prototype.chat=function(msg)
{
	if(valid_robot(this.robot))
	{
		var uri="?append="+encodeURIComponent(this.handle+": "+msg)+
			"&trim="+this.maxlines;
		superstar_generic(this.robot,"chat",uri);
	}
}

chatter_t.prototype.create_interval=function()
{
	var _this=this;
	if(this.chat_interval)
		clearInterval(this.chat_interval);
	this.chat_interval=setInterval(function()
	{
		if(valid_robot(_this.robot))
			superstar_generic(_this.robot,"chat","?get",function(data)
			{
				_this.history.value=data;
				_this.history.scrollTop=_this.history.scrollHeight;
			});
	},500);
}
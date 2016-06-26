//Members
//		onloadfile() - triggered when load button is hit

function modal_loadstate_t(div, state_table)
{
	this.modal=new modal_t(div);
	this.browse_input=document.createElement("input");
	this.load_button=document.createElement("input");
	this.cancel_button=document.createElement("input");

	if(!this.modal)
	{
		this.modal=null;
		return null;
	}

	var myself=this;

	this.modal.set_title("Select file to load");

	this.browse_input.type="file";
	this.browse_input.onchange=function() {
		myself.load_button.disabled=false;
	}
	this.modal.get_content().appendChild(this.browse_input);

	this.load_button.className="btn btn-primary";
	this.load_button.disabled=true;
	this.load_button.type="button";
	this.load_button.value="Load";
	this.load_button.onclick=function()
	{
		if(myself.oncreate)
			myself.oncreate();

		var file = myself.browse_input.files[0];
		var reader = new FileReader();
		reader.readAsText(file);
		reader.onloadend = function()
		{
			try
			{
				//FIXME: HOW SHOULD THIS HANDLE OVERWRITING? SHOULD IT AT ALL?
				var json=JSON.parse(reader.result);
				state_table.build(json);
				myself.modal.hide();
			}
			catch(error)
			{
				//FIXME: MAKE THIS SHOW AN ERROR
				console.log("LOAD ERROR! - "+error);
			}
		}
	};

	this.modal.get_footer().appendChild(this.load_button);

	this.cancel_button.className="btn btn-primary";
	this.cancel_button.type="button";

	this.cancel_button.value="Cancel";
	this.cancel_button.onclick=function()
	{
		if(myself.oncancel)
			myself.oncancel();

		myself.modal.hide();
	};

	this.modal.close_button.onclick=function()
	{
		if(myself.oncancel)
			myself.oncancel();

		myself.modal.hide();
	}
	this.modal.get_footer().appendChild(this.cancel_button);
}

modal_createcancel_t.prototype.show=function()
{
	this.modal.show();
}

modal_createcancel_t.prototype.hide=function()
{
	this.modal.hide();
}


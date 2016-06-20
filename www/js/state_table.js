/*
 Manage the UI of the "Code" tab of the main robot pilot interface

 Mike Moss, 2015-08 (Public Domain)
*/

//Members
//		onrefresh() - callback triggered when window needs updating (resizes)
//		onrun() - callback triggered when run button is hit
//		onstop() - callback triggered when stop button is hit

function state_table_t(doorway)
{
	if(!doorway||!doorway.content)
		return null;

	var _this=this;
	this.old_time=get_time();
	this.old_last_experiment=null;
	this.old_robot=null;
	this.doorway=doorway;
	this.overwrite_modal=new modal_yesno_t(this.doorway.parent_div,"Warning","");
	this.div=doorway.content;
	this.last_experiment=this.old_last_experiment;
	this.last_save_hash=null;
	this.autosave_time_interval=1000;
	this.old_experiments_list=[];

	this.createnew={};
	this.createnew.modal=new modal_createcancel_t(this.doorway.parent_div,"Create New Experiment","");
	this.createnew.modal.modal.get_content().style.height="80px";

	this.createnew.div=document.createElement("div");
	this.createnew.div.className="form-group";
	this.createnew.div.style.float="left";
	this.createnew.modal.modal.get_content().appendChild(this.createnew.div);

	this.createnew.name=document.createElement("input");
	this.createnew.name.type="text";
	this.createnew.name.placeholder="Experiment Name";
	this.createnew.name.className="form-control";
	this.createnew.name.style.width="320px";
	this.createnew.name.spellcheck=false;
	this.createnew.name.onchange=function(event){_this.update_experiment_m();};
	this.createnew.name.onkeydown=function(event){_this.update_experiment_m();};
	this.createnew.name.onkeyup=function(event){_this.update_experiment_m();};
	this.createnew.name.onkeypress=function(event){_this.update_experiment_m();};
	this.createnew.name.addEventListener('keypress',function(e)
	{
		if((e.which||e.keyCode)===13)
			_this.createnew.modal.create_button.click();
	});
	this.createnew.div.appendChild(this.createnew.name);

	this.createnew.glyph=document.createElement("span");
	this.createnew.glyph.className="glyphicon form-control-feedback glyphicon glyphicon-remove";
	this.createnew.div.appendChild(this.createnew.glyph);

	this.createnew.label=document.createElement("label");
	this.createnew.div.appendChild(this.createnew.label);
	this.createnew.label.style="col-sm-2 control-label";
	this.createnew.label.style.color="#800000";

	this.load_file_modal=new modal_loadstate_t(this.doorway.parent_div, this);

	this.make_error_span=function(text)
	{
		var errors=document.createElement("span");
		if(text)
			errors.innerHTML=text;
		errors.style.color="#800000"; // dark red text
		errors.style.background="#ffa0a0";  // light red background
		return errors;
	}
	this.global_errors=this.make_error_span();
	this.div.appendChild(this.global_errors);
	this.last_error_entry=null;

	this.element=document.createElement("div");
	this.drag_list_div=document.createElement("div");
	this.drag_list=new drag_list_t(this.drag_list_div);
	this.controls_div=document.createElement("div");

	this.experiment_drop=new dropdown_t(this.controls_div);
	this.experiment_drop.onchange=function()
	{
		_this.set_autosave(false);
		_this.last_experiment=_this.experiment_drop.selected();
		_this.load_button_pressed_m();
	};

	this.run_button=document.createElement("input");
	this.new_button=document.createElement("input");
	this.add_button=document.createElement("input");
	this.load_file_button=document.createElement("input");
	this.entries=[];

	if(!this.drag_list)
	{
		this.div=null;
		this.element=null;
	}

	this.element.style.width="auto";
	this.element.style.minWidth=640;
	this.div.appendChild(this.element);

	this.element.appendChild(this.controls_div);
	this.element.appendChild(document.createElement("br"));

	this.element.appendChild(this.drag_list_div);

	this.run_button.type="button";
	this.run_button.className="btn btn-primary";
	this.run_button.style.marginLeft=10;
	this.run_button.disabled=false;
	this.run_button.value="Run";
	this.run_button.title_run="Click here to save this code and make it execute.";
	this.run_button.title=this.run_button.title_run;
	this.run_button.title_stop="Click to stop this code.";
	this.run_button.onclick=function(event){_this.run_button_pressed_m();};
	this.controls_div.appendChild(this.run_button);

	this.new_button.type="button";
	this.new_button.className="btn btn-primary";
	this.new_button.style.marginLeft=10;
	this.new_button.disabled=false;
	this.new_button.value="New";
	this.new_button.title="Click here to create a new experiment.";
	this.new_button.onclick=function(event)
	{
		_this.createnew.modal.oncreate=function()
		{
			_this.set_autosave(false);
			_this.autosave_m();
			var experiment=_this.createnew.name.value;
			var old_robot=JSON.parse(JSON.stringify(_this.old_robot));
			_this.clear();
			_this.upload(old_robot,function()
			{
				_this.last_experiment=experiment;
				_this.download_m(old_robot);
			},experiment);

			_this.createnew.name.value="";
		};
		_this.createnew.modal.oncancel=function()
		{
			_this.createnew.name.value="";
		};
		_this.update_experiment_m();
		_this.createnew.modal.show();
		_this.createnew.name.focus();
	};
	this.controls_div.appendChild(this.new_button);

	this.load_file_button.type="button";
	this.load_file_button.className="btn btn-primary";
	this.load_file_button.style.float="right";
	this.load_file_button.style.marginLeft=10;
	this.load_file_button.disabled=false;
	this.load_file_button.value="Load State from File";
	this.load_file_button.title="Click here to load a state from a local file.";
	this.load_file_button.onclick=function(event){_this.load_file_button_pressed_m();};
	this.controls_div.appendChild(this.load_file_button);

	this.add_button.type="button";
	this.add_button.className="btn btn-primary";
	this.add_button.style.float="right";
	this.add_button.disabled=false;
	this.add_button.value="Add State";
	this.add_button.title="Click here to add a new blank robot state to this list.";
	this.add_button.onclick=function(event){_this.add_button_pressed_m();};
	this.controls_div.appendChild(this.add_button);

	this.set_autosave(true);

	this.download_experiments();
}

state_table_t.prototype.set_autosave=function(on)
{
	var _this=this;
	if(this.autosave_interval)
		clearInterval(this.autosave_interval);
	if(on)
		this.autosave_interval=setInterval(function(){_this.autosave_m();},1000);
}

state_table_t.prototype.download_with_check=function(robot,skip_get_active,ondownload)
{
	if(!robot||!robot.name)
		return;
	var _this=this;
	_this.download(robot,skip_get_active,ondownload);
}

state_table_t.prototype.download=function(robot,skip_get_active,callback)
{
	this.old_robot=JSON.parse(JSON.stringify(robot));

	this.clear();

	if(!robot||!robot.name)
		return;

	var _this=this;

	if(skip_get_active)
	{
		_this.download_m(robot,callback);
	}
	else
	{
		superstar_get(robot,"active_experiment",function(obj)
		{
			if(obj&&obj.length>0)
			{
				_this.last_experiment=obj;
				_this.download_m(robot,callback);
			}
			else
			{
				_this.add_button_pressed_m();
				_this.set_autosave(true);
				_this.autosave_m(true);
			}
		});
	}

	this.update_states_m();
}

state_table_t.prototype.download_experiments=function()
{
	if(this)
	{
		var _this=this;
		if(this.old_robot)
		{
			superstar_sub(this.old_robot,"experiments",function(experiments)
			{
				for(k in experiments)
					experiments[k]=decodeURIComponent(experiments[k]);
				experiments=remove_duplicates(experiments);
				if(experiments.length==0)
				{
					if(!_this.last_experiment)
						experiments.push("HelloWorld");
					else
						experiments.push("No experiments found.");
				}
				_this.experiment_drop.build(experiments,_this.last_experiment);
				_this.update_buttons_m();
			});
		}
		setTimeout(function(){_this.download_experiments();},1000);
	}
}

state_table_t.prototype.upload_with_check=function(robot,onupload)
{
	if(!robot)
		return;

	var _this=this;

	superstar_get(robot,"experiments/"+encodeURIComponent(this.get_experiment_name())+"/code",
		function(obj)
		{
			if(_this.last_experiment&&obj&&obj.length>0&&_this.last_experiment!=_this.get_experiment_name())
			{
				_this.overwrite_modal.set_message("This will overwrite the non-empty experiment named \""+
					_this.get_experiment_name()+"\". Proceed?");
				_this.overwrite_modal.onok=function(){_this.upload(robot,onupload);}
				_this.overwrite_modal.show();
			}
			else
			{
				_this.upload(robot,onupload);
			}
		});
}

state_table_t.prototype.get_experiment_name=function()
{
	if(this.experiment_drop.selected_index()>=0&&this.experiment_drop.selected())
		return this.experiment_drop.selected();
	return "";
}

state_table_t.prototype.upload=function(robot,onupload,experiment)
{
	if(!robot)
		return;


	var _this=this;

	if(!experiment)
		experiment=this.get_experiment_name();

	var new_hash=this.calc_save_hash_m(robot,experiment,this.get_states());

	if(new_hash!=this.last_save_hash)
	{
		superstar_set(robot,"experiments/"+encodeURIComponent(experiment)+"/code",this.get_states(),
			function()
			{
				if(experiment)
					superstar_set(robot,"active_experiment",experiment,
						function()
						{
							_this.last_save_hash=new_hash;
							_this.last_experiment=experiment;

							if(onupload)
								onupload();
						});
			});
	}
}

state_table_t.prototype.get_states=function()
{
	var data=[];

	var entries=this.get_entries();

	for(var key in entries)
	{
		if(entries[key])
		{
			var obj={};
			obj.name=entries[key].input.text.value;
			obj.time=entries[key].time.value;
			obj.code=entries[key].code_editor.getValue();
			data.push(obj);
		}
	}

	return data;
}


// Debug prints
state_table_t.prototype.clear_prints=function()
{
	var entries=this.get_entries();

	for(var key in entries)
		if(entries[key])
			entries[key].prints.textContent="";
}

state_table_t.prototype.show_prints=function(print_text,current_state)
{
	var print_entry=this.find_entry(current_state);
	if (!print_entry) return;

	print_entry.prints.textContent=print_text;
}


// Error reporting onscreen
state_table_t.prototype.clear_error=function()
{
	this.show_error("",""); // hacky way to clear errors
}

state_table_t.prototype.show_error=function(error_text,current_state)
{
	var error_entry=null;
	if (current_state) error_entry=this.find_entry(current_state);

	var global_report="", local_report="";
	if (error_text)
	{
		local_report="Error here: "+error_text;
		if (error_entry) { // detailed error next to state
			global_report="Error in state '"+current_state+"'";
		} else {
			global_report="Error in state '"+current_state+"': "+error_text;
		}
	}

	this.global_errors.textContent=global_report;

	if (this.last_error_entry) {
		this.last_error_entry.errors.textContent=""; // clear last error
		this.last_error_entry.drag_list.li.style.backgroundColor=""; // clear background
	}

	if (!error_entry) return; // a bad state name, or what?

	error_entry.errors.textContent=local_report;
	error_entry.drag_list.li.style.backgroundColor="#ffe000"; // light red background

	this.last_error_entry=error_entry;
}

state_table_t.prototype.get_entries=function()
{
	this.entries.sort(function(lhs,rhs)
	{
		if(lhs&&rhs)
			return lhs.drag_list.li.offsetTop-rhs.drag_list.li.offsetTop;
	});

	var entries=[];

	for(var key in this.entries)
		if(this.entries[key])
			entries.push(this.entries[key]);

	this.entries=entries;

	return this.entries;
}

state_table_t.prototype.create_entry=function(state,time,code,focus)
{
	if(!state)
		state="";

	if(!code)
		code="";

	if(!time)
		time="";

	var old_size=
	{
		body:
		{
			offsetWidth:parseInt(this.doorway.body.offsetWidth,10),
			offsetHeight:parseInt(this.doorway.body.offsetHeight,10),
			scrollHeight:parseInt(this.doorway.body.scrollHeight,10)
		},
		content:
		{
			scrollHeight:parseInt(this.doorway.content.scrollHeight,10)
		}
	};

	var _this=this;
	var entry={};
	entry.drag_list=this.drag_list.create_entry();
	entry.drag_list.li.style.minWidth=740;
	entry.drag_list.ondrag=function(){_this.onstop_m();};
	entry.drag_list.state_table_t=entry;
	entry.drag_list.onremove=function(entry){_this.remove_entry_m(entry.state_table_t);};
	this.create_entry_m(entry,state,time,code);
	this.entries.push(entry);
	this.update_states_m();

	if(this.run_button.value!="Run")
		this.onstop_m();

	var new_size=
	{
		body:
		{
			offsetWidth:parseInt(this.doorway.body.offsetWidth,10),
			offsetHeight:parseInt(this.doorway.body.offsetHeight,10),
			scrollHeight:parseInt(this.doorway.body.scrollHeight,10)
		},
		content:
		{
			scrollHeight:parseInt(this.doorway.content.scrollHeight,10)
		}
	};

	var delta_size=
	{
		body:
		{
			offsetWidth:new_size.body.offsetWidth-old_size.body.offsetWidth,
			offsetHeight:new_size.body.offsetHeight-old_size.body.offsetHeight,
			scrollWidth:new_size.body.scrollWidth-old_size.body.scrollWidth,
			scrollHeight:new_size.body.scrollHeight-old_size.body.scrollHeight
		},
		content:
		{
			scrollHeight:new_size.content.scrollHeight-old_size.content.scrollHeight
		}
	};

	var size=
	{
		width:new_size.body.offsetWidth,
		height:new_size.body.offsetHeight+delta_size.body.scrollHeight
	};

	if(old_size.content.scrollHeight!=new_size.content.scrollHeight)
		this.doorway.resize(size);

	this.doorway.body.scrollTop=this.doorway.body.scrollHeight;

	if(focus)
		entry.input.text.focus();

	return entry;
}

state_table_t.prototype.find_entry=function(state_name)
{
	var entries=this.get_entries();

	for(var key in entries)
	{
		if(entries[key])
		{
			if(entries[key].input.text.value==state_name)
				return entries[key];
		}
	}

	return null;
}

state_table_t.prototype.remove_entry=function(entry)
{
	if(!entry||!entry.drag_list)
		return;

	this.drag_list.remove_entry(entry.drag_list);
}

state_table_t.prototype.set_active=function(state)
{
	var entries=this.get_entries();

	for(var key in entries)
	{
		var e=entries[key];
		if(e)
		{
			var color="";
			if(e.input.text.value==state) { // currently running state
				color="#337ab7";
			}
			if (e.errors.textContent!="") { // reporting an error
				color="#ffd0d0";
			}

			e.drag_list.li.style.backgroundColor=color;
		}
	}
}

state_table_t.prototype.run=function()
{
	this.run_button.value="Stop";
	this.run_button.title=this.run_button.title_stop;
}

state_table_t.prototype.clear=function()
{
	this.drag_list.clear();
}

state_table_t.prototype.download_m=function(robot,callback)
{
	var _this=this;
	superstar_get(robot,"experiments/"+encodeURIComponent(this.last_experiment)+"/code",
	function(obj)
	{
		if(obj&&obj.length>0)
			for(var key in obj)
				_this.create_entry(obj[key].name,obj[key].time,obj[key].code);
		else
			_this.create_entry("start","","// JavaScript code\n");

		_this.old_last_experiment=_this.last_experiment;
		_this.download_experiments();

		if(callback)
			callback();
	});
}

state_table_t.prototype.run_button_pressed_m=function()
{
	if(this.run_button.value=="Run")
		this.onrun_m();
	else
		this.onstop_m();
}

state_table_t.prototype.add_button_pressed_m=function()
{
	this.onstop_m();

	var state_name="";

	if(this.get_states().length==0)
		state_name="start";

	this.create_entry(state_name,"","// JavaScript code\n",true);
}

state_table_t.prototype.load_file_button_pressed_m=function()
{
	this.onstop_m();

	var state_name="";

	if(this.get_states().length==0)
		state_name="start";

	this.load_file_modal.modal.show();
}

state_table_t.prototype.load_button_pressed_m=function()
{
	var _this=this;
	this.onstop_m();
	this.clear_error();

	this.download_with_check(_this.old_robot,true,
		function()
		{
			_this.upload(_this.old_robot,null,_this.last_experiment);
			_this.set_autosave(true);
		});

}

state_table_t.prototype.onrun_m=function()
{
	if(this.onrun)
		this.onrun(this);
}

state_table_t.prototype.onstop_m=function()
{
	if(this.onstop)
		this.onstop(this);

	this.run_button.value="Run";
	this.run_button.title=this.run_button.title_run;
}

state_table_t.prototype.refresh_m=function()
{
	if(this.onrefresh)
		this.onrefresh();
}

state_table_t.prototype.create_entry_m=function(entry,state,time,code)
{
	if(!entry||!entry.drag_list)
		return;

	if(!state)
			state="";

	if(!time)
		time="";

	if(!code)
		code="";

	var _this=this;
	entry.table={};
	entry.table.element=document.createElement("table");
	entry.table.row=entry.table.element.insertRow(0);
	entry.table.left=entry.table.row.insertCell(0);
	entry.table.code=entry.table.row.insertCell(1);
	entry.table.right=entry.table.row.insertCell(2);
	entry.input={};
	entry.input.div=document.createElement("div");
	entry.input.glyph=document.createElement("span");
	entry.input.text=document.createElement("input");
	entry.time=document.createElement("input");
	entry.download_button=document.createElement("span");

	entry.table.row.style.verticalAlign="middle";
	entry.table.left.style.paddingRight=10;
	entry.drag_list.content.appendChild(entry.table.element);

	entry.input.div.className="form-group has-feedback has-error";
	entry.table.left.appendChild(entry.input.div);

	entry.input.text.type="text";
	entry.input.text.placeholder="Name";
	entry.input.text.className="form-control";
	entry.input.text.style.width="128px";
	entry.input.text.spellcheck=false;
	entry.input.text.size=10;
	entry.input.text.value=state;
	entry.input.text.entry_input=entry.input;
	entry.input.text.onchange=function(event){_this.update_states_m();_this.autosave_m();};
	entry.input.text.onkeydown=function(event){_this.update_states_m();};
	entry.input.text.onkeyup=function(event){_this.update_states_m();};
	entry.input.text.onkeypress=function(event){_this.update_states_m();};
	this.update_states_m();
	entry.input.div.appendChild(entry.input.text);

	entry.input.glyph.className="glyphicon form-control-feedback glyphicon glyphicon-remove";
	entry.input.div.appendChild(entry.input.glyph);

	entry.time.type="text";
	entry.time.placeholder="Run Time (ms)";
	entry.time.className="form-control";
	entry.time.style.width="128px";
	entry.time.spellcheck=false;
	entry.time.size=10;
	entry.time.value=time;
	entry.time.onchange=function(event){_this.validate_time_m(this);_this.autosave_m();};
	entry.time.onkeydown=function(event){_this.validate_time_m(this);};
	entry.time.onkeyup=function(event){_this.validate_time_m(this);};
	entry.time.onkeypress=function(event){_this.validate_time_m(this);};
	this.validate_time_m(entry.time);
	entry.table.left.appendChild(entry.time);

	entry.errors=this.make_error_span();
	entry.table.code.appendChild(entry.errors);

	entry.textarea=document.createElement("textarea");
	entry.textarea.value=code;
	entry.table.code.appendChild(entry.textarea);

	entry.prints=document.createElement("span");
	entry.table.right.appendChild(entry.prints);

	entry.code_editor=CodeMirror.fromTextArea(entry.textarea,
	{
		indentUnit:4,
		indentWithTabs:true,
		lineNumbers:true,
		matchBrackets:true,
		mode:"text/x-javascript"
	});
	entry.code_editor.on("change",function(){_this.code_change_m();_this.autosave_m();});
	entry.code_editor.setSize(500);
	entry.code_editor_event=function(event){entry.code_editor.refresh();};
	window.addEventListener("click",entry.code_editor_event);

	entry.download_button.className="glyphicon glyphicon-download-alt";
	entry.download_button.style.display="inline-block";
	entry.download_button.style.width="100%";
	entry.download_button.style.marginTop="5px";
	entry.download_button.style.textAlign="center";
	entry.download_button.style.cursor="pointer";
	entry.download_button.style.color="#ccc";
	entry.download_button.onmouseover=function(event) {
		  event.target.style.color="#aaa";
	};
	entry.download_button.onmouseout=function(event) {
		    event.target.style.color="#ccc";
	};
	entry.download_button.onclick=function(event) {
		var code = entry.code_editor.getValue();
		var fake_link = document.createElement("a");
		fake_link.download = state + '.js';
		fake_link.href = URL.createObjectURL(new Blob([code]));
		document.body.appendChild(fake_link);
		fake_link.click();
		document.body.removeChild(fake_link);
	}
	entry.table.left.appendChild(entry.download_button);

	this.refresh_m();
}

state_table_t.prototype.remove_entry_m=function(entry)
{
	if(!entry)
		return;

	for(var key in this.entries)
	{
		if(this.entries[key]&&this.entries[key]===entry)
		{
			window.removeEventListener("click",this.entries[key].code_editor_event);
			this.entries[key]=undefined;
			break;
		}
	}

	var new_entries=[];

	for(var key in this.entries)
		if(this.entries[key])
			new_entries.push(this.entries[key]);

	this.entries=new_entries;

	this.refresh_m();
	this.update_states_m();

	if(this.run_button.value!="Run")
		this.onstop_m();
}

state_table_t.prototype.update_states_m=function()
{
	for(var key in this.entries)
		if(this.entries[key])
			this.set_state_name_valid_m(this.entries[key].input,this.validate_state_m(this.entries[key].input));

	this.onstop_m();
	this.update_buttons_m();
}

state_table_t.prototype.validate_state_m=function(input)
{
	if(!input)
		return true;

	while(input.text.value.length>0&&!is_ident(input.text.value))
		input.text.value=input.text.value.substr(0,input.text.value.length-1);

	var valid=input.text.value.length>0&&input.text.value!="state";

	var entries=this.get_entries();
	var counts={};

	for(var key in entries)
	{
		if(entries[key])
		{
			if(!counts[entries[key].input.text.value])
				counts[entries[key].input.text.value]=1;
			else
				counts[entries[key].input.text.value]+=1;
		}
	}

	if(counts[input.text.value]>1)
		valid=false;

	return valid;
}

state_table_t.prototype.validate_time_m=function(input)
{
	while(input.value.length>0&&!is_time(input.value))
		input.value=input.value.substr(0,input.value.length-1);

	if(this.run_button.value!="Run")
		this.onstop_m();
}

state_table_t.prototype.set_state_name_valid_m=function(input,valid)
{
	if(valid)
	{
		input.div.className="form-group";
		input.glyph.style.visibility="hidden";
	}
	else
	{
		input.div.className="form-group has-feedback has-error";
		input.glyph.style.visibility="visible";
	}
}

state_table_t.prototype.update_buttons_m=function(valid)
{
	var entries=this.get_entries();
	var valid=true;

	for(var key in entries)
		if(entries[key]&&!this.validate_state_m(entries[key].input))
			valid=false;

	if(!this.experiment_drop.selected())
		valid=false;

	this.run_button.disabled=!valid;
	//this.load_button.disabled=(this.get_experiment_name().length==0);

	if(this.run_button.value=="Run")
		this.onstop_m();
}

state_table_t.prototype.update_experiment_m=function()
{
	var error=(this.createnew.name.value.length == 0);
	this.createnew.label.innerHTML="";

	for(var key in this.old_experiments_list)
	{
		if(this.createnew.name.value==this.old_experiments_list[key])
		{
			this.createnew.label.innerHTML="Experiment with this name already exists.";
			error=true;
			break;
		}
	}

	if(error)
	{
		this.createnew.div.className = "form-group has-feedback has-error";
		this.createnew.glyph.style.visibility="visible";
		this.createnew.modal.create_button.disabled=true;
	}
	else
	{
		this.createnew.error="";
		this.createnew.div.className = "form-group";
		this.createnew.glyph.style.visibility="hidden";
		this.createnew.modal.create_button.disabled=false;
	}

	this.update_buttons_m();
}

state_table_t.prototype.code_change_m=function()
{
	this.autosave_m();
	if(this.run_button.value!="Run")
		this.onstop_m();
}

state_table_t.prototype.autosave_m=function(force)
{
	var time=get_time();

	if(force||this.old_last_experiment==this.last_experiment&&(time-this.old_time)>this.autosave_time_interval)
	{
		this.upload(this.old_robot);
		this.old_time=time;
	}
}

state_table_t.prototype.calc_save_hash_m=function(robot,experiment,code)
{
	return JSON.stringify(robot)+JSON.stringify(experiment)+JSON.stringify(code);
}

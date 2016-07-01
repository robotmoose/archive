/*
  This is the main operator control interface for a driving robot,
  in the new 2015-07 UI style.

Members
	onpilot(pilotdata) - callback triggered when pilot data needs to be sent
*/




/* Walk the DOM to get the client X,Y position of this element's topleft corner.
  From www.kirupa.com/snippets/examples/move_to_click_position.htm */
 /*Gets the client X,Y position with .getBoundingClientRectangle
		https://developer.mozilla.org/en-US/docs/Web/API/Element.getBoundingClientRect*/
function getClientPosition(element) {
	var temp = element.getBoundingClientRect(); //Gets coordinate data
	var xPosition = temp.left;
	var yPosition = temp.top;
	return { x: xPosition, y: yPosition };
}
/* Return the fractional mouse position of the mouse relative to this element.
   Returns x=0.0 at the left edge, x=1.0 at the right edge;
           y=0.0 at the top edge, y=1.0 at the bottom edge. */
function getMouseFraction(event,domElement) {
  var corner=getClientPosition(domElement);
  var xFrac=(event.clientX-corner.x)/domElement.scrollWidth;
  var yFrac=(event.clientY-corner.y)/domElement.scrollHeight;
  return { x:xFrac, y:yFrac };
}


// Return an "empty" robot power object, with everything stationary
function emptyPower()
{
	return {L:0, R:0};
}


// Round this number to the nearest thousandth, making it look pretty.
function pretty(number) {
	return Math.round(number*1000)/1000.0;
}

// Clamp this value between lo and hi
function clamp(v,lo,hi) {
	if (v<lo) return lo;
	if (v>hi) return hi;
	else return v;
}



// Return the current wall clock time, in seconds
function pilot_time() {
	return (new Date()).getTime()/1000.0;
}



function pilot_interface_t(div)
{
	var myself=this;
	if(!div)
		return null;

	this.pilot={
		/* Power to each actuator */
		power: emptyPower(),

		/* Time, in seconds, of last pilot command */
		time:0,

		/* Scripted command to run */
		cmd: { run: "", arg:"" }
	};


	this.div=div;

	this.element=document.createElement("div");
	this.element.style.display="table";
	this.element.style.margin="auto auto";
	this.div.appendChild(this.element);

	// Keyboard driving
	this.mouse_in_div=0;
	this.keyboardIsDriving=false;
	this.keyInput=new input_t(function() {myself.pilot_keyboard()},window);

	// Gamepad support
	if (navigator.getGamepads()[0]) {
		$.notify({message: 'Gamepad connected.'}, {type: 'success'});
		myself.gamepad_interval = setInterval(function() {
			myself.handle_gamepad_input(myself);
		}, 50);
	}
	else this.gamepad_interval = null;
}

// Configure our pilot GUI for the current firmware setup
pilot_interface_t.prototype.reconfigure=function(config_editor)
{
	var entries=config_editor.get_entries();

	// Check if we need to reconfigure at all
	var entries_string="";
	for(var key in entries) if(entries[key]) entries_string+=entries[key].type+",";
	if (entries_string==this.last_entries_string) return; // no changes to report
	this.last_entries_string=entries_string;

	// Clear out existing pilot GUI elements from our div
	while (this.element.firstChild) {
		this.element.removeChild(this.element.firstChild);
	}
	// this.pilot.power=emptyPower(); //<- cleaner, but loses servo positions on reconfigure

	// Add pilot GUI elements for each configured device
	var servos=0, pwms=0, blinks=0;
	for(var key in entries)
	if(entries[key])
	{
		var type=entries[key].type;
		switch (type) {
		case "create2":
		case "bts":
		case "sabertooth1":
		case "sabertooth2":
			this.make_drive(entries[key]);
			break;

		case "servo":
			this.make_slider(entries[key],"servo",servos, 0,180);
			servos++;
			break;

		case "pwm":
			this.make_slider(entries[key],"pwm",pwms, 0,100);
			pwms++;
			break;

		default: // ignore unknown object
			break;
		};
	}
}

// Add GUI element for a simple adjustable value, stored in pilot.name[number]
pilot_interface_t.prototype.make_slider=function(config_entry,name,number, minval,maxval)
{
	var myself=this;
	var pilotpower=myself.pilot.power;
	if (!pilotpower[name]) pilotpower[name]=[];
	var value=pilotpower[name][number];
	if (!value) value=0.0;
	if(name=="servo") value=90.0;

	var p=document.createElement("p");
	var label_name=document.createTextNode(name+"["+number+"] = ");
	var label_value=document.createTextNode(""+(0xffFFffFF&value));

	var slider=document.createElement("input");
	slider.type="range";
	slider.min=minval;
	slider.max=maxval;
	slider.value=value;
	slider.onchange=slider.oninput=function() {
		pilotpower[name][number]=parseInt(slider.value);
		myself.pilot_send();
		label_value.nodeValue=""+(0xffFFffFF&pilotpower[name][number]);
	}

	p.appendChild(label_name);
	p.appendChild(label_value);
	p.appendChild(slider);
	this.element.appendChild(p);
}

// Add GUI elements for driving around (arrows)
pilot_interface_t.prototype.make_drive=function(config_entry)
{
	var column_left_width=160;
	var column_right_width=160;
	var column_padding=10;

	// Make arrow div
	this.arrowDiv=document.createElement("div");
	this.arrowDiv.title="Click to drive the robot.  Hold down to keep driving.";
	this.arrowDiv.style.backgroundColor="#808080";
	this.arrowDiv.style.position="relative";
	this.arrowDiv.style.width=this.arrowDiv.style.height=column_left_width+column_padding+column_right_width;
	this.element.appendChild(this.arrowDiv);

	// Drive power input
	var starting_percent=20;
	this.drive=
	{
		div:document.createElement("div"),
		label:document.createElement("label"),
		slider:document.createElement("input")
	};

	this.drive.div.className="form-group";
	this.drive.div.style.marginTop=column_padding;
	this.element.appendChild(this.drive.div);

	this.drive.label.style.width=column_left_width;
	this.drive.label.style.float="left";
	this.drive.label.style.marginRight=column_padding;
	this.drive.slider.onchange=function(){myself.update_drive_text();}
	this.drive.slider.oninput=function(){myself.update_drive_text();}
	this.drive.div.appendChild(this.drive.label);

	this.drive.slider.type="range";
	this.drive.slider.size=8;
	this.drive.slider.min=0;
	this.drive.slider.max=100;
	this.drive.slider.step=1;
	this.drive.slider.value=starting_percent;
	this.drive.slider.style.width=column_right_width;
	this.drive.div.appendChild(this.drive.slider);

	this.update_drive_text();

	// Mouse event handlers for arrow div
	var myself=this;
	this.mouse_down=0;
	this.mouse_in_div=0;
	this.arrowDiv.onmousedown=function(evt) { myself.pilot_mouse(evt,1,0); };
	this.arrowDiv.ondragstart=function(evt) { myself.pilot_mouse(evt,1,0); };
	this.arrowDiv.onmouseup=function(evt) { myself.pilot_mouse(evt,-1,0); };
	this.arrowDiv.onmouseover=function(evt) { myself.pilot_mouse(evt,0,+1); };
	this.arrowDiv.onmouseout=function(evt) { myself.pilot_mouse(evt,-1,-1); };
	this.arrowDiv.onmousemove=function(evt) { myself.pilot_mouse(evt,0,0); };
	this.arrowDiv.ondblclick=function(evt) { myself.pilot_mouse(evt,0,0); };

	// Gamepad event handlers
	window.addEventListener('gamepadconnected', function(e) {
		$.notify({message: 'Gamepad connected.'}, {type: 'success'});
		myself.gamepad_interval = setInterval(function() {
			myself.handle_gamepad_input(myself);
		}, 50);
	});
	window.addEventListener('gamepaddisconnected', function(e) {
		$.notify({message: 'Gamepad disconnected.'}, {type: 'danger'});
		clearInterval(myself.gamepad_interval);
	});

	// Add arrow image
	var img=document.createElement("img");
	img.src="/images/arrows_hard.png";
	img.style.position="absolute";
	img.style.left=img.style.top="0px";
	img.style.width=img.style.height="100%";
	img.style.pointerEvents="none";
	this.arrowDiv.appendChild(img);
}

pilot_interface_t.prototype.update_drive_text=function()
{
	this.drive.label.innerHTML="Drive power ("+this.drive.slider.value+"%):";
}


// Return the drive power the user has currently selected
pilot_interface_t.prototype.get_pilot_power=function() {
	var maxPower=1.0;

	var powerUI=0.2;
	if (this.drive&&this.drive.slider) powerUI=parseFloat(this.drive.slider.value)*0.01;
	if (isNaN(powerUI)) powerUI=0.2;
	else if (powerUI<maxPower) { maxPower=powerUI; }

	return maxPower;
}

// This function is called at every mouse event.
//   mouse_down_del: +1 if down, -1 if up, 0 if unchanged (move)
//   mouse_in_del: +1 if entering, -1 if leaving, 0 if unchanged
pilot_interface_t.prototype.pilot_mouse=function(event,mouse_down_del,mouse_in_del) {
	if (mouse_in_del) this.mouse_in_div=mouse_in_del;

	if (mouse_down_del>0) this.mouse_down=1;
	if (mouse_down_del<0) this.mouse_down=-1;

	// console.log("Mouse event: down="+this.mouse_down+"  down del="+mouse_down_del+"   in="+this.mouse_in_div+"  in del="+mouse_in_del);

// Allow user to set maximum power
	var maxPower=this.get_pilot_power();

	var arrowDiv=this.arrowDiv;
	var frac=getMouseFraction(event,arrowDiv);
	var str="";

	var dir={ forward: pretty(0.5-frac.y), turn:pretty(frac.x-0.5) };

	str+="Move "+dir.forward+" forward, "+dir.turn+" turn<br>\n";

//Proportional control.  The 2.0 is because mouse is from -0.5 to +0.5
	dir.forward=dir.forward*2.0*maxPower;
	dir.turn=dir.turn*2.0*maxPower;

	var mousePower={"L":0.0, "R":0.0};
	mousePower.L=pretty(clamp(dir.forward+dir.turn,-maxPower,maxPower));
	mousePower.R=pretty(clamp(dir.forward-dir.turn,-maxPower,maxPower));

	if (this.mouse_down>0 && this.mouse_in_div>0) {
		arrowDiv.style.backgroundColor='#222222';
		str+=" SENDING";
	} else {
		arrowDiv.style.backgroundColor='#404040';
		mousePower.L=mousePower.R=0.0;
		str+=" (click to send)";
	}

	this.pilot.power.L=100.0*mousePower.L;
	this.pilot.power.R=100.0*mousePower.R;
	this.pilot_send();

	// document.getElementById('p_outputPilot').innerHTML=str;
	event.stopPropagation();
};

//This function is called at every keypress event
// FIXME: Add proportional control
pilot_interface_t.prototype.pilot_keyboard=function()
{
	if (this.mouse_in_div<1)
		return;

	// console.log("Keyboard activity");
	var maxPower=this.get_pilot_power();

	// Return true if this key (as a string) is pressed
	var keyInput=this.keyInput;
	var keyDown=function(key,alternateKey) {
		var code=key.charCodeAt(0);
		// console.log("Key code "+code+" : "+keyInput.keys_down[code]);

		if (keyInput.keys_down[code]) return true;

		if (alternateKey) return keyDown(alternateKey);  // hacky recursion
		return false;
	}

	var forward=0.0, turn=0.0;

	if(keyDown('a','A')) turn-=1.0; // 'a' is pressed, turn left
	if(keyDown('d','D')) turn+=1.0; //'d' is pressed, turn right
	if(keyDown('s','S')) forward-=1.0; //'s' is pressed, reverse
	if(keyDown('w','W')) forward+=1.0;
	if(keyDown(' ')) turn=forward=0.0; // stop!

	if(!keyDown('a','A')&&!keyDown('d','D')&&!keyDown('s','S')&&!keyDown('w','W'))
		forward=turn=0;

	if (turn==0.0 && forward==0.0)
		this.keyboardIsDriving=false;
	else
		this.keyboardIsDriving=true;

	this.pilot.power.L=100.0*clamp(maxPower*(forward+turn),-maxPower,+maxPower);
	this.pilot.power.R=100.0*clamp(maxPower*(forward-turn),-maxPower,+maxPower);
	this.pilot_send();
}


// It's not clear a pilot needs to download data, but it's easy:
pilot_interface_t.prototype.download=function(robot)
{
	//superstar_get(robot,"pilot",function(newPilot) { this.pilot=newPilot; });
	//this.pilot=robot_network.pilot;
}

pilot_interface_t.prototype.upload=function(robot)
{
	//superstar_set(robot,"pilot",this.pilot);
	robot_network.pilot=this.pilot;
}

// This is a simple placeholder, to get things working for now:
pilot_interface_t.prototype.pilot_send=function() {
	if (this.onpilot) this.onpilot(this.pilot);
};

pilot_interface_t.prototype.handle_gamepad_input=function(myself) {
	var axes = navigator.getGamepads()[0].axes;
	myself.pilot.power.L = 0;
	myself.pilot.power.R = 0;

	if (axes[0] < -0.1) {
		myself.pilot.power.R += -axes[0];
	}
	if (axes[0] > 0.1) {
		myself.pilot.power.L+= axes[0];
	}
	if (axes[1] < -0.1) {
		myself.pilot.power.L+= -axes[1];
		myself.pilot.power.R += -axes[1];
	}
	if (axes[1] > 0.1) {
		myself.pilot.power.L+= -axes[1];
		myself.pilot.power.R += -axes[1];
	}
	myself.pilot.power.L*= 50;
	myself.pilot.power.R *= 50;
	// console.log(`L: ${myself.pilot.power.L}`);
	// console.log(`R: ${myself.pilot.power.R}`);
	myself.pilot_send();
}
/*
  This is the real version, with network spam prevention and authentication and such.

// This counts outstanding network requests
var networkBusy=0;
var delayedRequest =false;
// Send our last-used piloting command out across the network
function pilot_send() {
	if (networkBusy>1)
	{ // prevent overloading network: skip sending if already busy
		document.getElementById('p_outputNet').innerHTML="network lag";
		delayedRequest = true;
		return;
	}
	networkBusy++;

	var send_time=pilot.time=pilot_time();
	var pilotStr=JSON.stringify(pilot);
	//console.log(pilotStr);

	var starpath=robot_name()+"/pilot";
	var starcmd="?set="+encodeURIComponent(pilotStr);

	var password=document.getElementById('robot_auth').value;
	if (password) { // append authentication code
		var seq="0"; //<- FIXME: get sequence number on first connection
		var auth=getAuthCode(password,starpath,pilotStr,seq);
		starcmd+="&auth="+auth;
	}

	superstar_send(starpath,starcmd,function(xmlhttp) {
		var status="Network Error";
		if (xmlhttp.status==200)
		{
			status="Data sent at t="+send_time+" ("+pretty(pilot_time()-send_time)+" second roundtrip)";
			if (networkBusy>1) status+=" ["+networkBusy+" requests in flight]";
		}
		document.getElementById('p_outputNet').innerHTML=status;
		networkBusy--;
		if(networkBusy == 0)
		{
			if(delayedRequest)
			{
				delayedRequest = false;
				pilot_send();
			}
		}
	});

	sensor_receive(); // Read Sensor Data at every Send
}
*/



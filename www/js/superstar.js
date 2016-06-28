/**
  Superstar network interface
  Talks to superstar server.

  robot fields:
  	superstar: string name of superstar server
  	name: string name of robot (URI encoded)
  	school: string name of robot's organization (URI encoded)
  	auth: authentication code (password for robot), or empty

  This file is shared between the chrome app backend and web front end.
*/

// Error handling code
function superstar_error(user_errorhandler,why_string)
{
	console.log("Superstar network error: "+why_string);
	if (user_errorhandler) user_errorhandler(why_string);
}

// Build the full request string for this path on this robot
function superstar_path(robot,path) {
	var fullpath="robots/";
	if (robot.year) fullpath+=robot.year+"/";
	if (robot.school) fullpath+=robot.school+"/";
	if (robot.name) fullpath+=robot.name+"/";
	if (path) fullpath+=path;
	return fullpath;
}

// Generic string-in string-out network communication code.
function superstar_generic(robot,path,request,on_success,on_error)
{
	var starpath=superstar_path(robot,path);
	var url="";
	if (robot.superstar) url="http://"+robot.superstar;
	url+="/superstar/"+starpath+request;

	try
	{
		var xhr=new XMLHttpRequest();
		xhr.open("GET",url,true);
		xhr.onreadystatechange=function()
		{
			if(xhr.readyState==4)
			{
				if(xhr.status==200)
				{
					try
					{
						//console.log("Network "+url+" -> "+xhr.responseText);
						if(on_success)
							on_success(xhr.responseText);
					}
					catch(error)
					{
						superstar_error(on_error,"Error handling response \""+xhr.responseText+"\" ("+error+") from "+url);
					}
				}
				else
				{
					superstar_error(on_error,"Error receiving from server (status "+xhr.status+") from "+url);
				}
			}
		}

		xhr.send();
		return xhr;
	}
	catch(error)
	{
		superstar_error(on_error,"Network error ("+error+") from "+url);
		return null;
	}
}

// Get JSON object from a robot path
function superstar_get(robot,path,on_success,on_error)
{
	superstar_generic(robot,path,"?get",
		function(str) {
			var json=null;
			if(str!="") json=JSON.parse(str);
			on_success(json);
		}
	,on_error);
}

// Get multiple JSON object from multiple robot paths
function superstar_get_multiple(robot,paths,on_success,on_error)
{
	var request="?get=";
	for(var ii=0;ii<paths.length;++ii)
	{
		request+="/"+superstar_path(robot,paths[ii]);
		if(ii+1<paths.length)
			request+=",";
	}

	var starpath=superstar_path(robot,"");
	var url="";
	if (robot.superstar) url="http://"+robot.superstar;
	url+="/superstar/"+starpath+request;

	try
	{
		var xhr=new XMLHttpRequest();
		xhr.open("GET",url,true);
		xhr.onreadystatechange=function()
		{
			if(xhr.readyState==4)
			{
				if(xhr.status==200)
				{
					try
					{
						//console.log("Network "+url+" -> "+xhr.responseText);
						if(on_success)
							on_success(JSON.parse(xhr.responseText));
					}
					catch(error)
					{
						superstar_error(on_error,"Error handling response \""+xhr.responseText+"\" ("+error+") from "+url);
					}
				}
				else
				{
					superstar_error(on_error,"Error receiving from server (status "+xhr.status+") from "+url);
				}
			}
		}

		xhr.send();
		return xhr;
	}
	catch(error)
	{
		superstar_error(on_error,"Network error ("+error+") from "+url);
		return null;
	}
}

// Get multiple JSON object from multiple robot paths
function superstar_set_and_get_multiple(robot,set_path,set_json,get_paths,on_success,on_error)
{
	var request="?set="+JSON.stringify(set_json)+"&get=";
	for(var ii=0;ii<get_paths.length;++ii)
	{
		request+="/"+superstar_path(robot,get_paths[ii]);
		if(ii+1<get_paths.length)
			request+=",";
	}

	var starpath=superstar_path(robot,set_path);
	var url="";
	if (robot.superstar) url="http://"+robot.superstar;
	url+="/superstar/"+starpath+request;

	try
	{
		var xhr=new XMLHttpRequest();
		xhr.open("GET",url,true);
		xhr.onreadystatechange=function()
		{
			if(xhr.readyState==4)
			{
				if(xhr.status==200)
				{
					try
					{
						//console.log("Network "+url+" -> "+xhr.responseText);
						if(on_success)
							on_success(JSON.parse(xhr.responseText));
					}
					catch(error)
					{
						superstar_error(on_error,"Error handling response \""+xhr.responseText+"\" ("+error+") from "+url);
					}
				}
				else
				{
					superstar_error(on_error,"Error receiving from server (status "+xhr.status+") from "+url);
				}
			}
		}

		xhr.send();
		return xhr;
	}
	catch(error)
	{
		superstar_error(on_error,"Network error ("+error+") from "+url);
		return null;
	}
}


// Subscribe to JSON changes at this robot path.
//  This repeatedly calls on_success with the updated objects
//  until you call .abort on the object this returns.
function superstar_getnext(robot,path,on_success,on_error)
{
	var state={};
	state.current=""; // assume current string value of path is empty

	// Fetch the next value from the server
	state.getnext=function() {
		state.abort(); // stop any previous work
		state.timeout=setTimeout(state.repeat,2*60*1000); // getnext will time out every 5 minutes, so repeat request every few minutes.

		// Send off network request:
		state.xhr=superstar_generic(robot,path,"?getnext="+encodeURIComponent(state.current),
			function(str) {
				// Done with this request:
				state.xhr=undefined;
				state.abort_timeout();

				state.current=str;
				if (str!="")
					state.json=JSON.parse(str);
				else state.json=null;

				on_success(state.json);

				state.getnext(); // call ourselves to do it again
			}
		,on_error);
	}

	// Reload the request from the server
	state.repeat=function() {
		state.getnext();
	}

	// Stop all in-progress requests.
	state.abort=function() {
		state.abort_xhr();
		state.abort_timeout();
	}

	// Stop any in-progress XmlHttpRequest network request
	state.abort_xhr=function() {
		if (state.xhr) {
			state.xhr.abort();
			state.xhr=undefined;
		}
	}

	// Stop any in-progress timeout
	state.abort_timeout=function() {
		if (state.timeout) {
			clearTimeout(state.timeout);
			state.timeout=undefined;
		}
	}

	state.getnext(); // start first one
	return state; // hand back access object
}

// Write this object to this path
function superstar_set(robot,path,json,on_success,on_error)
{
	var json_str=JSON.stringify(json);
	var auth=robot.auth;
	if(!robot.auth)
		auth="";

	if (robot.auth) {
		var starpath=superstar_path(robot,path);
		var seq="0"; // <- fixme: fight replay by getting sequence number from server first
		auth = "&auth="+getAuthCode(robot.auth,starpath,json_str,seq);
		//console.log(path,"Authentication code "+auth);
	}

	json_str=encodeURIComponent(json_str);
	superstar_generic(robot,path,"?set="+json_str+auth,
		function(response) {
			if (on_success) on_success();
		}
	,on_error);
}


// List this subdirectories to this path
//   Return them to on_success as an array of strings
function superstar_sub(robot,path,on_success,on_error)
{
	if (!robot) robot={};
	superstar_generic(robot,path,"?sub",
		function(response) {
			if (response=="") response="[]"; // empty array
			var json=JSON.parse(response);
			on_success(json);
		}
	,on_error);
}



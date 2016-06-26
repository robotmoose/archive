function chart_interface_t(div) {
	if(!div) return null;

	var _this=this;

	// Stores chart data and related elements. Indexed by sensor name.
	this.charts = {
		canvas: {},
		//smoothie: {},
		chart: {},
		//data: {},
		data_points: {},
		header: {}
	};

	// ***** Create UI ***** //
	this.div=div;
	this.controls_div=document.createElement("div");
	this.chart_div=document.createElement("div");

	this.chart_drop=new dropdown_t(this.controls_div);

	this.add_button=document.createElement("input");
	this.add_button.type="button";
	this.add_button.className="btn btn-primary";
	this.add_button.style.marginLeft=10;
	this.add_button.style.disabled = false;
	this.add_button.value="Add";
	this.add_button.title_add="Click here to add a chart for the selected sensor.";
	this.add_button.title=this.add_button.title_add;
	this.add_button.onclick=function() {_this.add_chart()};

	this.remove_button=document.createElement("input");
	this.remove_button.type="button";
	this.remove_button.className="btn btn-primary";
	this.remove_button.style.marginLeft=10;
	this.remove_button.style.disabled = false;
	this.remove_button.value="Remove";
	this.remove_button.title_remove="Click here to remove the chart for the selected sensor.";
	this.remove_button.title=this.remove_button.title_remove;
	this.remove_button.onclick=function() {_this.remove_chart()};

	// Add created UI elements to tab.
	this.controls_div.appendChild(this.add_button);
	this.controls_div.appendChild(this.remove_button);
	this.div.appendChild(this.controls_div);
	this.div.appendChild(document.createElement("br"));
	this.div.appendChild(this.chart_div);
}

chart_interface_t.prototype.refresh=function(json) {
	var sensor_list = [];
	for(var prop in json) {
		if(!json.hasOwnProperty(prop)) {
			continue;
		}

		switch(prop) {
			// Sensors where there can be only one.
			case "power":
				for(var subprop in json[prop]) {
					if(!json[prop].hasOwnProperty(subprop)) {
						continue;
					}
					if(subprop == "servo") {
						for(i=0; i < json[prop][subprop].length; ++i) {
							sensor_list.push(subprop + "_" + i);
							if(this.doesExist(this.charts.data_points[subprop + "_" + i])) {
								this.charts.data_points[subprop + "_" + i].datasets[0].data.push(json[prop][subprop][i]);
								this.charts.data_points[subprop + "_" + i].labels.push(0);
								if(this.charts.data_points[subprop + "_" + i].datasets[0].data.length > 30) {
									this.charts.data_points[subprop + "_" + i].datasets[0].data.shift();
									this.charts.data_points[subprop + "_" + i].labels.shift();
								}
								this.charts.chart[subprop + "_" + i].update();
								this.charts.header[subprop + "_" + i].innerHTML = subprop + "_" + i + " (" + json[prop][subprop][i] + ")";
							}
						}
					}
				}
				break;
			case "bumper":
			case "heartbeats":
			case "latency":
				sensor_list.push(prop);
				if(this.doesExist(this.charts.data_points[prop])) {
					this.charts.data_points[prop].datasets[0].data.push(json[prop]);
					this.charts.data_points[prop].labels.push(0);
					if(this.charts.data_points[prop].datasets[0].data.length > 30) {
						this.charts.data_points[prop].datasets[0].data.shift();
						this.charts.data_points[prop].labels.shift();
					}
					this.charts.chart[prop].update();
					this.charts.header[prop].innerHTML = prop + " (" + json[prop] + ")";
				}
				break;

			// Sensor where there can be multiple, and they are stored in an array.
			case "analog":
			case "encoder_raw":
			case "ultrasonic":
				for(i=0; i < json[prop].length; ++i) {
					sensor_list.push(prop + "_" + i);
					if(this.doesExist(this.charts.data_points[prop + "_" + i])) {
						this.charts.data_points[prop + "_" + i].datasets[0].data.push(json[prop][i]);
						this.charts.data_points[prop + "_" + i].labels.push(0);
						if(this.charts.data_points[prop + "_" + i].datasets[0].data.length > 30) {
							this.charts.data_points[prop + "_" + i].datasets[0].data.shift();
							this.charts.data_points[prop + "_" + i].labels.shift();
						}
						this.charts.chart[prop + "_" + i].update();
						this.charts.header[prop + "_" + i].innerHTML = prop + "_" + i + " (" + json[prop][i] + ")";
					}
				}
				break;
			// Create 2 Sensors
			// case "light":
			// 	sensor_list.push(prop);
			// 	if(this.doesExist(this.charts.data[prop])){
			// 		this.charts.data[prop + "_" + i].append(new Date().getTime(), json[prop][i]);
			// 	}
			default:
				break;
		}
	}
	this.chart_drop.build(sensor_list);
}

chart_interface_t.prototype.doesExist=function(variable) {
	if(typeof variable === "undefined" || variable === null)
		return false;
	return true;
}

chart_interface_t.prototype.add_chart=function() {
	var _this = this;
	if(!_this.doesExist(_this.charts.data_points[_this.chart_drop.value])) {
	 	_this.charts.canvas[_this.chart_drop.value] = document.createElement("canvas");
	 	_this.charts.header[_this.chart_drop.value] = document.createElement("h4");
	 	_this.charts.header[_this.chart_drop.value].innerHTML = _this.chart_drop.value;
	 	_this.charts.canvas[_this.chart_drop.value].width = 500;
	 	_this.charts.canvas[_this.chart_drop.value].height = 100;
	 	//_this.charts.canvas[_this.chart_drop.value].style="width:70%; height:150";

		_this.chart_div.appendChild(_this.charts.header[_this.chart_drop.value]);
		_this.chart_div.appendChild(_this.charts.canvas[_this.chart_drop.value]);

		// Initialize the data
		_this.charts.data_points[_this.chart_drop.value] = {
			labels:[],
			datasets: [{
				data: [],
				// Line Options
				fill: false, // Don't fill area under line
				pointRadius: 0, // Don't draw points
				borderColor: "#0BB5FF"
			}]
		};

		// Create the actual chart
		_this.charts.chart[_this.chart_drop.value] = new Chart(_this.charts.canvas[_this.chart_drop.value].getContext('2d'), {
			type: 'line',
			data: _this.charts.data_points[_this.chart_drop.value],
			options: {
				responsive: true,
				maintainAspectRatio: true,
				animation: {
					duration: 10
				},
				legend: {
					display: false
				},
				scales: {
					xAxes: [{
						display: false
					}],
					yAxes: [{
						gridLines: {
							display: false
						}
					}]
				}
			}
		});
	}
}

chart_interface_t.prototype.remove_chart=function() {
	var _this = this;
	if(_this.doesExist(_this.charts.data_points[_this.chart_drop.value])) {
		// Clean up
		_this.chart_div.removeChild(_this.charts.canvas[_this.chart_drop.value]);
		_this.chart_div.removeChild(_this.charts.header[_this.chart_drop.value]);
		_this.charts.canvas[_this.chart_drop.value] = null;
		_this.charts.header[_this.chart_drop.value] = null;
		_this.charts.data_points[_this.chart_drop.value] = null;
		_this.charts.chart[_this.chart_drop.value].destroy();
		_this.charts.chart[_this.chart_drop.value] = null;

	}
}

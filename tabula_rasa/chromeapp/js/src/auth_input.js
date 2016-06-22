/*
 * Accepts a password for robots which require it
 *
 * Callbacks:
 * 	on_change(auth) - Called when the password is changed.
*/

function auth_input_t(div, on_change) {
	var _this = this;
	this.div = div;
	this.on_change = on_change
	this.input = document.createElement("input");
	this.input.style.width = "99.5%";
	this.input.placeholder = "Password";
	this.input.type = "password";
	this.input.oninput = function(event) {
		on_change(event.target.value);
	};
	div.appendChild(this.input);
}


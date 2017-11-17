/**
 * @module levelsSettings
 * @fileoverview Levels settings: levels definitions with colors and express Statuses
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

//levels definitions
module.exports.levels = {
  debug: 7,  	   	//debug-level messages
	info:	6, 		    //informational messages
	notice: 5, 		  //normal but significant condition
	warning: 4, 		//warning conditions
	error: 3, 		  //error conditions
	critical: 2, 		//critical conditions
	alert:	1, 	    //action must be taken immediately
	emergency: 0, 	//system is unusable
};

module.exports.lowestLevel = "debug";

module.exports.colors = {
  debug: 'green',
	info:	'blue',
	notice: 'grey',
	warning: 'yellow',
	error: 'red',
	critical: 'red',
	alert:	'red',
	emergency: 'red'
};

module.exports.levelFromStatus = () =>{
  return (req, res) => {
    var level = "";
    if (res.statusCode >= 100) {
      level = "debug";
    }
    if (res.statusCode >= 400) {
      level = "warning";
    }
    if (res.statusCode >= 500) {
      level = "error";
    }
    return level;
  };
};

var waterfall = require("./waterfall.js");

waterfall(
	waterfall(function a1(then) {
		console.log("a1"); then();
	}, function a2(then) {
		console.log("a2"); then();
	}),
	
	waterfall(function b1(then) {
		console.log("b1"); then();
	}, function b2(then) {
		console.log("b2"); then();
	},
		waterfall(function c1(then) {
			console.log("c1"); then();
		}, function c2(then) {
			console.log("c2"); then();
		}),
		
	function b3(then) {
		console.log("b3"); then();
	})
)();
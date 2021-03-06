import DefaultLevel from "./DefaultLevel.js";

class Level2 extends DefaultLevel{
	constructor(){
		super(2.5, 2.5);
		this._layoutManager.setLayout(
			[
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,,,,,,,,,,,1,,,,,,,,,,,,,,,,,1,,,,,,,,,,,1],
				[1,,,,,,,1,,,,,,,,1,,,,1,1,,,,1,,,,,,,,1,,,,1,1,,1],
				[1,,,,,,,1,,,,,,,,1,,,,1,1,,,,1,,,,,,,,1,,,,1,1,,1],
				[1,,,,,,,,,,,1,,,,,,,,,,,,,,,,,1,,,,,,,,,,,1],
				[1,,,,,1,1,1,1,1,1,1,1,1,1,1,,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,,,,,1],
				[1,,,,,1,,1,1,,,,,,,,,1,,,,,,,,,,1,1,,1,,,,1,,,,,1],
				[1,,1,1,,1,,,,,1,1,1,1,1,1,,1,1,1,1,,1,1,1,1,,1,,,,,1,,1,,1,1,,1],
				[1,,,,,1,1,1,1,1,1,,,,,,,,,,1,,1,1,,,,1,1,1,1,1,1,,1,,,,,1],
				[1,,,,,1,,,,,,,1,,1,1,1,1,,1,1,,1,,,1,,,,,,,1,,1,,,,,1],
				[1,,,,,1,1,,1,1,1,1,1,,1,,,1,,1,,,1,,1,1,1,1,1,1,1,,1,,1,,,,,1],
				[1,1,,,1,1,1,,1,,,,,,1,1,,1,,1,1,1,1,,,,1,,,,1,,1,,1,1,,,1,1],
				[1,,,,,1,1,,1,,1,1,1,,,1,,1,,1,,,1,,1,1,1,,1,,,,1,,1,,,,,1],
				[1,,,,,1,1,,1,1,1,,1,1,1,1,,1,,1,,1,1,,1,1,,,1,,1,,,,1,,,,,1],
				[1,,,,,1,,,1,,,,,,,1,,1,,1,,1,,,,1,,1,1,,1,1,1,1,1,,,,,1],
				[1,,1,1,,1,1,,1,,1,1,1,1,,,,1,,1,,1,1,,1,1,,,1,,1,,,,1,,1,1,,1],
				[1,,,,,1,1,,1,,1,,,1,,1,1,1,,1,,1,,,,1,,1,1,,1,,1,,1,,,,,1],
				[1,,,,,1,1,,1,,1,,1,1,,,,,,1,,1,,1,1,1,,1,1,,1,,1,,1,,,,,1],
				[1,,,,,1,,,1,,1,,1,1,1,1,1,1,1,1,,1,,,,1,,1,,,1,1,1,,1,,,,,1],
				[1,,1,1,,1,1,,1,,1,,,,,,,,,,,1,,1,,1,,1,1,,,,,,,,1,1,,1],
				[1,,1,1,,1,1,,1,,1,1,1,1,1,1,1,1,1,,1,1,,1,,1,,1,1,1,1,1,1,,1,,1,1,,1],
				[1,,,,,1,1,,1,,,,,,,,,,1,,1,1,,1,,1,,,,,,,1,,1,,,,,1],
				[1,,,,,,,,1,,1,1,1,1,1,,1,1,1,,,,,1,1,1,,1,1,1,1,,1,,1,,,,,1],
				[1,,,,,1,1,,1,,,,,,1,,1,1,,,1,1,,,1,1,,,1,,1,1,1,,1,,,,,1],
				[1,,1,1,,1,1,,1,1,1,1,1,,1,,1,,,1,1,1,1,,,1,1,,1,,,,,,1,,1,1,,1],
				[1,,,,,1,1,,1,,,,1,1,1,,1,1,,,,,1,1,,,1,1,1,1,1,1,,1,1,,,,,1],
				[1,,,,,1,1,,1,1,1,,,1,1,,,1,,1,1,,1,,,,,,,,1,1,,,1,,,,,1],
				[1,,,,,1,1,,1,1,1,1,,1,1,,1,1,1,1,1,,1,1,1,1,1,1,1,,,1,,1,1,,,,,1],
				[1,1,,,1,1,1,,,,,1,,1,1,,1,,,,,,,,,,,,1,1,,1,,1,1,1,,,1,1],
				[1,,,,,1,1,1,,1,,1,,,1,,1,1,1,1,1,1,1,1,,1,1,,,1,,1,,1,1,,,,,1],
				[1,,,,,1,,,,1,,1,1,,1,,,,1,1,1,,,1,,,1,1,1,1,,1,,1,1,,,,,1],
				[1,,,,,1,,1,1,1,,1,1,,1,1,1,,,,,,1,1,1,1,1,1,,,,1,,1,1,,,,,1],
				[1,,1,1,,1,,1,,1,,1,1,,1,,1,1,1,1,1,,,,,,,,,1,1,1,,1,1,,1,1,,1],
				[1,,,,,1,,,,1,,,,,,,,,,,1,1,1,,1,1,,1,1,1,,,,1,1,,,,,1],
				[1,,,,,1,1,1,1,1,1,1,1,,1,1,1,1,1,1,1,1,1,1,1,1,,1,1,1,1,1,1,1,1,,,,,1],
				[1,,,,,,,,,,,1,,,,,,,,,,,,,,,,,1,,,,,,,,,,,1],
				[1,,1,1,,,,1,,,,,,,,1,,,,1,1,,,,1,,,,,,,,1,,,,1,1,,1],
				[1,,1,1,,,,1,,,,,,,,1,,,,1,1,,,,1,,,,,,,,1,,,,1,1,,1],
				[1,,,,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,,,,,,,,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
			]
		);
	}
	summon(){
		return []; //ADD ENTITIES INTO THIS ARRAY
	}
}

export default Level2;
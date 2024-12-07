import replace from "@rollup/plugin-replace";
import watch from "rollup-plugin-watch";

export default {
	input: "tracker/index.js",
	output: [
		{
			file: "public/script.js",
			format: "cjs",
			name: "Arunya Tracker",
			sourcemap: false,
		},
	],
	plugins: [
		watch({
			dir: "tracker",
		}),
		replace({
			preventAssignment: true,
			__BASE_URL__: process.env.BASE_URL || "http://localhost:3000",
		}),
	],
};

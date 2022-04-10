// [\w.-] => Maven identifier (repo id, group id, or artifact id)

export const downloadingLinesRegEx = /^(\[INFO\] )?Download(?:ing|ed) from [\w.-]*:/
export const downloadingProgressLineRegEx = /^Progress \(\d+\): /
export const whitespaceLineRegEx = /^\s*$/

// Top Level Regions:
// [INFO] Reactor Build Order:
// [INFO] ---------------------< com.example:example-parent >---------------------
// [INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:
// [INFO] BUILD SUCCESS
export const topLevelStartRegEx = /^\[INFO\] (?:Reactor Build Order:|-{2,}< [\w.-]+:[\w.-]+ >-{2,}|Reactor Summary for.*|BUILD (?:SUCCESS|FAILURE))$/

// Second Level Regions:
// [INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-lib ---
export const secondLevelStartRegEx = /^\[INFO\] --- [:\w.-]+ \([\w.-]*\) @ [\w.-]+ ---$/

// Third level Regions:
// [INFO] Running com.example.exampleapp.ExampleAppApplicationTests
export const thirdLevelStartRegEx = /^\[INFO\] Running [\w\.]*$/
// [INFO] Results:
export const thirdLevelEndRegEx =  /^\[INFO\] Results:$/






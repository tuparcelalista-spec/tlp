console.log("10 ha".match(/10 ha/));
console.log("10 ha".match(/[0-9]+/));
console.log("10 ha".match(/([0-9]+)\\s*(ha)/));
console.log("10 ha".match(/([0-9]+(?:[.,][0-9]+)?)\\s*(?:m2|has?)/gi));

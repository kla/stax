// Parses a CSV string into a key/value object (e.g. "a=b,c=d" => { a: "b", c: "d" })
export function csvKeyValuePairs(csv) {
  return (csv || []).split(',').sort().reduce((labels, label) => {
    const [key, value] = label.split('=', 2);
    labels[key] = value;
    return labels;
  }, {})
}

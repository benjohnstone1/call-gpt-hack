function checkLanguage(functionArgs) {
  const model = functionArgs.model;
  console.log("GPT -> called checkLanguage function");

  if (model?.toLowerCase().includes("english")) {
    return JSON.stringify({ locale: "en-US" });
  } else if (model?.toLowerCase().includes("french")) {
    return JSON.stringify({ locale: "fr" });
  } else if (model?.toLowerCase().includes("spanish")) {
    return JSON.stringify({ locale: "es" });
  } else if (model?.toLowerCase().includes("italian")) {
    return JSON.stringify({ locale: "it" });
  } else {
    return JSON.stringify({ locale: "en-US" });
  }
}

module.exports = checkLanguage;

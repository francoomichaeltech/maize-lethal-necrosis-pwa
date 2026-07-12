/* verdicts.js v1.0.0 - Single source of truth for verdict UI text and metadata. */
(function () {
  "use strict";

  const DATA = Object.freeze({
    healthy: {
      icon: "check_circle",
      cardMod: "verdict-card--healthy",
      barMod: "",
      title: { sw: "Jani Lina Afya Nzuri", en: "Healthy Maize Leaf" },
      message: {
        sw: "Jani hili linaonekana kuwa na afya nzuri. Hakuna dalili za MLN zilizobainika kwenye picha hii.",
        en: "This leaf appears healthy. No signs of MLN were detected in this image.",
      },
      recommendation: {
        sw: "Jani hili linaonekana kuwa na afya nzuri. Endelea kukagua shamba lako mara kwa mara na linda mazao yako kwa matumizi sahihi ya maji, mbolea, na usafi wa shamba.",
        en: "This leaf appears healthy. Keep checking your field regularly and protect your crop through proper watering, fertiliser use, and field hygiene.",
      },
      tips: {
        sw: ["Endelea kukagua shamba lako mara kwa mara", "Dumisha nafasi sahihi kati ya mimea", "Ondoa magugu na badilisha mazao kila msimu", "Tumia mbolea kwa ushauri wa mtaalamu"],
        en: ["Continue checking your field regularly", "Maintain proper spacing between plants", "Remove weeds and rotate crops each season", "Apply fertiliser based on expert advice"],
      },
      disclaimer: {
        sw: "M-Skana ni zana ya msaada tu. Matokeo haya si uthibitisho wa mwisho. Ukiwa na wasiwasi, wasiliana na afisa wa ugani.",
        en: "M-Skana is an assistive tool only. This result is not a final diagnosis. If you are concerned, contact an agricultural extension officer.",
      },
    },

    mln_infected: {
      icon: "warning",
      cardMod: "verdict-card--infected",
      barMod: "confidence-bar-fill--infected",
      title: { sw: "Dalili za MLN Zimebainika", en: "Signs of MLN Detected" },
      message: {
        sw: "Picha hii inaonyesha dalili za ugonjwa wa MLN. Chukua hatua mapema ili kupunguza kuenea kwa ugonjwa shambani.",
        en: "This image shows signs of MLN. Take action early to reduce the spread of the disease in your field.",
      },
      recommendation: {
        sw: "Dalili za MLN zimebainika. Ondoa mimea iliyoathirika mapema ili kupunguza kuenea kwa ugonjwa. Wasiliana na afisa wa ugani kwa ushauri zaidi.",
        en: "Signs of MLN have been detected. Remove affected plants early to reduce further spread. Contact an extension officer for more guidance.",
      },
      tips: {
        sw: ["Ondoa mimea iliyoathirika sana mapema", "Dhibiti wadudu wanaoweza kusambaza ugonjwa", "Tafuta ushauri wa afisa wa ugani haraka"],
        en: ["Remove severely affected plants early", "Control insects that may spread the disease", "Seek advice from an extension officer quickly"],
      },
      disclaimer: {
        sw: "M-Skana ni zana ya msaada tu. Usifanye maamuzi ya mwisho kwa matokeo haya pekee. Wasiliana na afisa wa ugani kwa uthibitisho.",
        en: "M-Skana is an assistive tool only. Do not make final decisions based on this result alone. Contact an extension officer for confirmation.",
      },
    },

    other_disease: {
      icon: "report_problem",
      cardMod: "verdict-card--uncertain",
      barMod: "confidence-bar-fill--uncertain",
      title: { sw: "Huenda Ni Ugonjwa Mwingine", en: "Possible Other Disease" },
      message: {
        sw: "Jani linaonyesha dalili za ugonjwa usiofanana na MLN. Huenda ni tatizo jingine la mmea linalohitaji uchunguzi zaidi.",
        en: "The leaf shows signs of a condition that may not be MLN. It may be another plant problem that needs further examination.",
      },
      recommendation: {
        sw: "Jani linaonyesha dalili za tatizo ambalo si MLN. Huenda ni ugonjwa mwingine wa mahindi. Wasiliana na mtaalamu wa kilimo kwa uchunguzi sahihi.",
        en: "The leaf shows signs of a problem that is not MLN. It may be another maize disease. Contact an agricultural expert for proper diagnosis.",
      },
      tips: {
        sw: ["Wasiliana na afisa wa ugani kwa utambuzi sahihi", "Usitumie dawa bila ushauri wa kitaalamu", "Kagua mimea mingine kama ina dalili zinazofanana"],
        en: ["Contact an extension officer for proper diagnosis", "Do not use pesticides without expert advice", "Check other plants for similar symptoms"],
      },
      disclaimer: {
        sw: "M-Skana imelenga zaidi kutambua MLN. Matokeo haya ni ishara ya awali tu, si utambuzi kamili wa ugonjwa mwingine.",
        en: "M-Skana is mainly designed to detect MLN. This result is only an early indicator, not a complete diagnosis of another disease.",
      },
    },

    not_maize: {
      icon: "block",
      cardMod: "verdict-card--uncertain",
      barMod: "confidence-bar-fill--uncertain",
      title: { sw: "Si Jani la Mahindi", en: "Not a Maize Leaf" },
      message: {
        sw: "Picha hii haionekani kuwa ya jani la mahindi. M-Skana huchambua majani ya mahindi tu.",
        en: "This image does not appear to show a maize leaf. M-Skana analyses maize leaves only.",
      },
      recommendation: {
        sw: "Picha hii haionekani kuwa ya jani la mahindi. Tafadhali piga picha ya jani moja la mahindi, kwa mwanga mzuri, likijaza sehemu kubwa ya fremu.",
        en: "This image does not appear to show a maize leaf. Please take a photo of a single maize leaf in good light, filling most of the frame.",
      },
      tips: {
        sw: ["Piga picha ya jani la mahindi", "Hakikisha jani linajaza sehemu kubwa ya picha", "Tumia mwanga mzuri na epuka vivuli", "Jaribu tena na picha mpya"],
        en: ["Take a photo of a maize leaf", "Make sure the leaf fills most of the image", "Use good lighting and avoid shadows", "Try again with a new photo"],
      },
      disclaimer: {
        sw: "M-Skana hufanya uchunguzi wa majani ya mahindi tu. Ukiwa na wasiwasi kuhusu mazao yako, wasiliana na afisa wa ugani.",
        en: "M-Skana checks maize leaves only. If you are concerned about your crops, contact an agricultural extension officer.",
      },
    },

    /* Uncertain: maize leaf probability ambiguous (between not_maize and maize thresholds) */
    uncertain_non_maize: {
      icon: "help",
      cardMod: "verdict-card--uncertain",
      barMod: "confidence-bar-fill--uncertain",
      title: {
        sw: "Matokeo Hayana Uhakika",
        en: "Uncertain Result",
      },
      message: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      recommendation: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      tips: {
        sw: ["Piga picha mpya yenye mwanga mzuri", "Hakikisha jani linajaza picha", "Epuka vivuli na picha yenye ukungu", "Hakikisha jani la mahindi linaonekana wazi"],
        en: ["Take a new photo in good lighting", "Make sure the leaf fills the image", "Avoid shadows and blurry photos", "Ensure the maize leaf is clearly visible"],
      },
      disclaimer: {
        sw: "Matokeo haya hayatoshi kufanya uamuzi. Ukiwa bado na wasiwasi, wasiliana na afisa wa ugani.",
        en: "This result is not enough to make a final decision. If you are still concerned, contact an extension officer.",
      },
    },

    /* Uncertain: disease class probabilities too close / below threshold */
    uncertain_disease: {
      icon: "help",
      cardMod: "verdict-card--uncertain",
      barMod: "confidence-bar-fill--uncertain",
      title: {
        sw: "Matokeo Hayana Uhakika",
        en: "Uncertain Result",
      },
      message: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      recommendation: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      tips: {
        sw: ["Piga picha mpya yenye mwanga mzuri", "Hakikisha jani linajaza picha", "Epuka vivuli na picha yenye ukungu", "Jaribu tena ukionyesha jani lote vizuri"],
        en: ["Take a new photo in good lighting", "Make sure the leaf fills the image", "Avoid shadows and blurry photos", "Try again showing the full leaf clearly"],
      },
      disclaimer: {
        sw: "Matokeo haya hayatoshi kufanya uamuzi. Ukiwa bado na wasiwasi, wasiliana na afisa wa ugani.",
        en: "This result is not enough to make a final decision. If you are still concerned, contact an extension officer.",
      },
    },

    /* Legacy fallback key — maps to uncertain_disease */
    uncertain: {
      icon: "help",
      cardMod: "verdict-card--uncertain",
      barMod: "confidence-bar-fill--uncertain",
      title: { sw: "Matokeo Hayana Uhakika", en: "Uncertain Result" },
      message: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      recommendation: {
        sw: "Mfumo haukupata uhakika wa kutosha kutoa jibu sahihi kwa picha hii. Hii inaweza kusababishwa na mwanga hafifu, ukungu wa picha, au dalili zinazofanana kati ya magonjwa. Tafadhali jaribu tena kwa kupiga picha iliyo wazi zaidi, yenye mwanga mzuri, na ikionyesha jani lote vizuri.",
        en: "The system could not reach sufficient confidence to give an accurate result for this image. This may be caused by poor lighting, a blurry photo, or overlapping symptoms between diseases. Please try again with a clearer photo taken in good light, showing the full leaf.",
      },
      tips: {
        sw: ["Piga picha mpya yenye mwanga mzuri", "Hakikisha jani linajaza picha", "Epuka vivuli na picha yenye ukungu"],
        en: ["Take a new photo in good lighting", "Make sure the leaf fills the image", "Avoid shadows and blurry photos"],
      },
      disclaimer: {
        sw: "Matokeo haya hayatoshi kufanya uamuzi. Ukiwa bado na wasiwasi, wasiliana na afisa wa ugani.",
        en: "This result is not enough to make a final decision. If you are still concerned, contact an extension officer.",
      },
    },
  });

  function get(verdict) {
    return DATA[verdict] || DATA.uncertain;
  }

  window.MskanaVerdicts = Object.freeze({ DATA, get });
})();

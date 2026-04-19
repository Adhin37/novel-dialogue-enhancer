// Full cultural gender indicator terms — used for proximity-based gender detection
export const CULTURAL_GENDER_TERMS = {
  chinese: {
    male: [
      "shixiong", "shidi", "gege", "dage", "tangge", "shushu", "bobo",
      "yeye", "shifu", "gongzi", "laoye", "wangye", "shizi", "langjun",
      "xiansheng", "xiong", "shaoye", "xianzhu", "fuma", "shizun",
      "dizi", "men", "nanren", "xiongdi", "shishu", "shibo", "shiye",
      "fuqin", "guan"
    ],
    female: [
      "shijie", "shimei", "jiejie", "meimei", "tangjie", "tangmei",
      "ayi", "nainai", "guniang", "xiaojie", "furen", "taitai", "wangfei",
      "gongzhu", "niangniang", "guifei", "gupo", "shitai", "shiniang",
      "dimei", "nu", "nuren", "jiemei", "nunu", "niangzi", "niangchan"
    ]
  },
  japanese: {
    male: [
      "otoko", "shounen", "danshi", "oniisan", "otouto", "ojisan",
      "ojiisan", "otousan", "danna", "shujin", "otto", "senpai", "kohai",
      "sensei", "kun", "bocchama", "dono", "tono", "-kun", "-dono",
      "-sama", "-san", "ani", "nii"
    ],
    female: [
      "onna", "shoujo", "joshi", "oneesan", "imouto", "obasan",
      "obaasan", "okaasan", "tsuma", "okusan", "kanai", "senpai", "kohai",
      "sensei", "chan", "ojousama", "hime", "-chan", "-san", "-sama",
      "ane", "nee"
    ]
  },
  korean: {
    male: [
      "namja", "sonyeon", "abeoji", "hyeong", "oppa", "ajussi",
      "harabeoji", "nampyeon", "yeobo", "sunbae", "hubae",
      "seonsaengnim", "gun", "ssi"
    ],
    female: [
      "yeoja", "sonyeo", "eomeoni", "unni", "eonni", "ajumma",
      "halmeoni", "anae", "yeobo", "sunbae", "hubae",
      "seonsaengnim", "yang", "ssi"
    ]
  }
};

// Subset of terms suitable as direct address after a character name: "{name} <term>"
export const CULTURAL_ADDRESS_TERMS = {
  chinese: {
    male:   ["dage", "gege", "shixiong", "shifu"],
    female: ["jiejie", "meimei", "shijie", "shimei"]
  },
  japanese: {
    male:   ["oniisan", "otouto", "otousan"],
    female: ["oneesan", "imouto", "okaasan"]
  },
  korean: {
    male:   ["oppa", "hyung", "abeoji"],
    female: ["unni", "eonni", "eomeoni"]
  }
};

// eastern-name-database.js
/**
 * East Asian name gender database for Chinese, Japanese, and Korean.
 * Used by NameAnalyzer for title/honorific, ending, pattern, and
 * direct name lookup checks.
 *
 * Chinese names use Title Case Pinyin to match romanised novel text.
 * Japanese names use Title Case Romaji.
 * Korean names use Title Case Revised Romanization.
 * Genuinely ambiguous short forms are excluded to avoid false positives.
 */

// ---------------------------------------------------------------------------
// Single / short names (Title Case). Matched against names of length <= 3.
// Names that appear in both male and female (e.g. "Min", "Jin") are omitted.
// ---------------------------------------------------------------------------

export const EASTERN_MALE_NAMES = {
  chinese: [
    // Common standalone male given names in Pinyin
    "Bo", "Lei", "Hao", "Jun", "Feng", "Long", "Peng", "Kun", "Fei",
    "Tai", "Hai", "Gang", "Ming", "Tao", "Cheng", "Qiang", "Bin", "Jian",
    "Dong", "Kai", "Yong", "Lie", "Zhan", "Wu", "Hu", "Qiu", "Bao",
    "Teng", "Xiong", "Zong", "Kang", "Quan", "Meng", "Pan",
    // Common male surnames used standalone
    "Ye", "Mo", "Shen",
  ],
  japanese: [
    // Common male short names / name-stems
    "Hiro", "Taka", "Kazu", "Masa", "Aki", "Dai", "Ken", "Shin", "Ryu",
    "Go", "Ren", "Sho", "Taro", "Jiro", "Ichiro", "Sota", "Yuto",
    "Kota", "Ryota", "Toma", "Soma", "Kaito", "Haruto", "Hayato",
    "Kento", "Yoshi", "Nobu", "Nori", "Toshi", "Haru", "Isamu",
    "Satoshi", "Makoto", "Minoru", "Hitoshi", "Osamu", "Goro", "Saburo",
    "Hajime", "Katsu",
  ],
  korean: [
    // Unambiguously male short forms
    "Jun", "Woo", "Seung", "Tae", "Ho", "Joon", "Seok", "Yong",
    "Cheol", "Hwan", "Gyu", "Dong", "Chang", "Jae", "Sung", "Han",
    "Il", "Won", "Hyuk", "Nam", "Sang", "Uk", "Wan", "Heon", "Beom",
    "Chan", "Deok", "Geun", "Gyun", "Hak", "Heung", "Ik", "Keun",
    "Kwang", "Kyun", "Man", "Myung", "Seop", "Sik",
  ],
};

export const EASTERN_FEMALE_NAMES = {
  chinese: [
    // Common standalone female given names in Pinyin
    "Yan", "Xin", "Mei", "Li", "Jing", "Ying", "Yue", "Hua", "Qian",
    "Ning", "Ping", "Zhen", "Jiao", "Qiao", "Lian", "Na", "Xia",
    "Juan", "Fang", "Lan", "Hong", "Rui", "Xue", "Zhu", "Shu", "Die",
    "He", "Su", "Qin", "Bi", "Nuo", "Rou", "Ling",
  ],
  japanese: [
    // Common female short names
    "Yuki", "Hana", "Miku", "Rin", "Saki", "Yui", "Kana", "Mao", "Rei",
    "Ai", "Emi", "Nana", "Mami", "Saya", "Moe", "Ami", "Sakura", "Yuna",
    "Akane", "Haruka", "Ayaka", "Chika", "Shiori", "Sena", "Mizuki",
    "Minami", "Megumi", "Kaede", "Honoka", "Hikari", "Hina", "Hitomi",
    "Kanon", "Kotone", "Maiko", "Natsuki", "Natsumi", "Reika", "Rena",
    "Rina", "Risa", "Sumire", "Wakana", "Yae",
  ],
  korean: [
    // Unambiguously female short forms
    "Hee", "Yeon", "Ji", "Soo", "Eun", "Ah", "Young", "Kyung", "Sun",
    "Ok", "Ja", "Seon", "Na", "Ra", "Yoo", "Mi", "Ri", "So", "Ha",
    "Ye", "In", "Seo", "Hwa", "Cho",
  ],
};

// ---------------------------------------------------------------------------
// Name endings (all lowercase). Matched against lowercased first name.
// ---------------------------------------------------------------------------

export const EASTERN_FEMALE_ENDINGS = {
  chinese: [
    // Common female-leaning Pinyin endings
    "xia", "qian", "ying", "yan", "yun", "juan", "xin", "min", "ning",
    "ping", "zhen", "hua", "jiao", "qiao", "mei", "yue", "lian", "wei",
    "xue", "shu", "die", "rou", "lan", "nuo", "qi", "er", "lin",
  ],
  japanese: [
    // Strongly female Japanese name endings (romaji)
    "ko", "mi", "na", "ka", "ri", "yo", "ho", "sa", "tsu", "chi",
    "haru", "kana", "saki", "nami", "ne", "ha", "no", "ze", "ie",
    "ume", "hana", "nana",
  ],
  korean: [
    // Common female Korean name endings (Revised Romanization)
    "mi", "hee", "jung", "young", "jin", "eun", "seon", "yeon", "ji",
    "hye", "kyung", "ah", "soo", "joo", "na", "ra", "yoo", "ri",
    "seo", "ye", "in",
  ],
};

export const EASTERN_MALE_ENDINGS = {
  chinese: [
    // Common male-leaning Pinyin endings
    "hao", "wei", "jian", "feng", "ming", "tao", "cheng", "jun", "gang",
    "long", "peng", "kun", "fei", "tai", "bo", "hai", "yu", "bang",
    "chen", "xiong", "zhan", "qiu", "lie", "ao", "kang", "quan",
    "teng", "shuo", "biao",
  ],
  japanese: [
    // Strongly male Japanese name endings (romaji)
    "ro", "ta", "to", "ki", "ji", "shi", "ya", "suke", "kazu", "hiro",
    "aki", "ichi", "dai", "nobu", "ma", "yoshi", "hiko", "taro", "jiro",
    "saburo", "goro", "ryo", "sho", "kei", "sei", "rou", "hei", "kata",
    "moto", "nori", "yuki", "take",
  ],
  korean: [
    // Common male Korean name endings (Revised Romanization)
    "ho", "seok", "woo", "joon", "sung", "hyun", "min", "seung", "jun",
    "cheol", "tae", "hwan", "gyu", "yong", "jae", "han", "il", "won",
    "hyuk", "nam", "uk", "wan", "heon", "beom", "chan", "geun", "kwang",
    "man", "myung", "rak", "sik",
  ],
};

// ---------------------------------------------------------------------------
// Honorifics and titles. Used as-is to match translated novel text.
// ---------------------------------------------------------------------------

export const EASTERN_MALE_TITLES = {
  chinese: [
    // Address terms and role titles for males
    "Dage", "Da-ge", "Gege", "Shixiong", "Dashixiong", "Ershixiong",
    "Shidi", "Shizun", "Shifu", "Shibo", "Shishu",
    "Taoist", "Monk", "Young Master", "Gongzi", "Laoye", "Fujun",
    "Xiandi", "Huangdi", "Wang", "Shaoye",
    "Er-ge", "San-ge", "Si-ge", "Wu-ge", "Liu-ge",
    "Sect Master", "Elder", "Qianbei", "Xiong", "Xiaodi",
    "Taifu", "Zhuangyuan", "Taishang", "Longzi", "Zunzhe",
  ],
  japanese: [
    // Address terms and role titles for males
    "Oniisan", "Onii-san", "Onii-sama", "Onii-chan", "Otouto", "Aniki",
    "Oji-san", "Otou-san", "Otou-sama", "Ojii-san", "Ojii-sama",
    "Sensei", "Senpai", "Dono", "Bocchama", "Shishou",
    "Daimyo", "Shogun", "Tono", "Oyaji", "Otokonoko",
    "Nii-san", "Nii-sama", "Nii-chan", "Oji-sama", "Ojisama",
    "Otousan", "Ojisan", "Ojii-chan", "Otou-chan",
  ],
  korean: [
    // Address terms and role titles for males
    "Oppa", "Hyung", "Ahjussi", "Harabeoji", "Samchon", "Appa",
    "Abeonim", "Seonsaengnim", "Sunbae", "Sajangnim", "Daejang",
    "Daegam", "Abeoji", "Hyungnim", "Nauri", "Jangun",
    "Daegun", "Gunjoo",
  ],
};

export const EASTERN_FEMALE_TITLES = {
  chinese: [
    // Address terms and role titles for females
    "Jiejie", "Da-jie", "Shijie", "Meimei", "Shimei",
    "Young Lady", "Young Miss", "Guniang", "Xiaojie",
    "Furen", "Taitai", "Niangniang", "Huanghou", "Gongzhu",
    "Wangfei", "Guifei", "Gupo", "Shenshen",
    "Er-jie", "San-jie", "Si-jie", "Wu-jie", "Liu-jie",
    "Aunt", "Fairy Maiden", "Nuxia", "Xianzi", "Xiannu",
  ],
  japanese: [
    // Address terms and role titles for females
    "Oneesan", "Onee-san", "Onee-sama", "Onee-chan", "Imouto", "Aneue",
    "Oba-san", "Okaa-san", "Okaa-sama", "Obaa-san", "Obaa-sama",
    "Ojou-sama", "Hime", "Fujin", "Himedono", "Shoujo",
    "Nee-san", "Nee-sama", "Nee-chan", "Obasan", "Obaasan",
    "Okaa-chan", "Okaasan", "Oba-sama", "Ojou-san",
  ],
  korean: [
    // Address terms and role titles for females
    "Unni", "Nuna", "Ahjumma", "Halmeoni", "Imo", "Eomma",
    "Eomeonim", "Seonsaengnim", "Sunbae", "Sajangnim",
    "Yeoja", "Agassi", "Agasshi", "Noonim", "Gongju",
    "Wangbi", "Daebuin", "Nangja",
  ],
};

// ---------------------------------------------------------------------------
// Cultural-specific regex patterns. Applied to full name before endings.
// ---------------------------------------------------------------------------

export const EASTERN_CULTURAL_PATTERNS = {
  chinese: {
    male: [
      // Common male surname prefixes (weak signal — surname does not imply gender alone)
      /^(Li|Wang|Zhang|Chen|Zhao|Yang|Liu|Wu|Sun|Xu|Yu|Hu|Zhou|Ma|Guo|He|Luo|Gao|Zheng|Xie)\s/i,
      // Role/title prefixes strongly associated with males
      /^(Young Master|Sect Master|Elder|Taoist|Senior Brother)\s/i,
      // Given name endings strongly male-leaning in Pinyin
      /(feng|long|hao|jun|wei|ming|tao|cheng|gang|peng|kun|fei|tai|bo|hai|bang|chen|lie|zhan|xiong|kang|quan|teng)$/i,
    ],
    female: [
      // Common female-leaning surname/first-name prefixes
      /^(Lin|Ying|Qian|Mei|Xia|Yun|Yan|Zhen|Hua|Xiao|Xue|Die|Lan)\s/i,
      // Role/title prefixes strongly associated with females
      /^(Young Miss|Young Lady|Fairy|Senior Sister)\s/i,
      // Given name endings strongly female-leaning in Pinyin
      /(xia|qian|ying|yan|yun|juan|xin|ning|ping|zhen|hua|jiao|qiao|mei|yue|lian|xue|die|rou|lan|nuo)$/i,
    ],
  },
  japanese: {
    male: [
      /^(Taka|Hiro|Yoshi|Kazu|Masa|Nobu|Haru|Sho|Ryu|Dai|Ken|Shin)/i,
      /(suke|hiko|taro|jiro|saburo|goro|maro|ro|ta|to|ryo|yoshi|nobu|kazu|ichi|hei)$/i,
    ],
    female: [
      /^(Saku|Yuki|Haru|Mao|Rin|Miku|Yui|Hana|Emi|Rei|Nana|Saya|Moe|Ami|Sakura|Yuna|Akane)/i,
      /(ko|mi|ka|na|yo|ne|me|ri|ha|tsu|chi|hana|nana|saki)$/i,
    ],
  },
  korean: {
    male: [
      /^(Min|Seung|Hyun|Jung|Jae|Do|Woo|Tae|Han|Sung|Ki|Il|Won|Hyuk)\s/i,
      /(ho|hwan|jun|seok|sung|hyun|min|seung|jae|han|il|won|hyuk|nam|uk|wan|heon|beom|chan|geun|kwang|man|myung)$/i,
    ],
    female: [
      /^(Seo|Ji|Hye|Yeon|Min|Hee|Eun|Na|Ra|Yoo|Mi|Ri|So|Ha|Ye|In)\s/i,
      /(mi|hee|jung|ah|soo|na|ra|yoo|ri|seo|ye|in|hwa|cho|eun|yeon|hye|kyung)$/i,
    ],
  },
};

/* Tải bảng chữ cái + từ vựng từ data/*.json (giữ 1 nguồn dữ liệu duy nhất,
   thêm từ mới chỉ cần sửa file JSON, không cần đụng vào code). */
let cachePromise = null;

export function getContent() {
  if (!cachePromise) {
    cachePromise = Promise.all([
      fetch("./data/alphabet.json").then((r) => r.json()),
      fetch("./data/vocabulary.json").then((r) => r.json()),
    ]).then(([alphabet, vocabulary]) => {
      const vocabByID = {};
      vocabulary.forEach((topic) => {
        vocabByID[topic.id] = topic;
      });
      return { alphabet, vocabulary, vocabByID };
    });
  }
  return cachePromise;
}

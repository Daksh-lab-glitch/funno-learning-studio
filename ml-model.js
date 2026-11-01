/*
 * Small, on-device K-means model for teacher-only classroom pattern discovery.
 * It receives only the current teacher's already RLS-filtered classroom rows;
 * no student data is sent to an external ML service or saved by this model.
 */
window.FunnoML = (() => {
  const FEATURES = ["attendance", "assessment", "participation", "quizAverage", "completionRate"];

  function distanceSquared(a, b) {
    return a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0);
  }

  function describe(centroid) {
    const [attendance, assessment, participation, quizAverage, completionRate] = centroid.map((value) => value * 100);
    const mean = centroid.reduce((sum, value) => sum + value, 0) / centroid.length * 100;

    if (mean >= 82) return { title: "Ready for a stretch", advice: "Celebrate this steady work and offer an optional deeper challenge." };
    if (attendance < 58) return { title: "A gentle check-in may help", advice: "Ask how learning is going and whether anything is getting in the way of attending." };
    if (quizAverage < 55 || assessment < 58) return { title: "Practice and retry", advice: "Offer a short, low-pressure quiz and revisit one idea at a time." };
    if (completionRate < 45) return { title: "Make the next step smaller", advice: "Break the next activity into a couple of clear steps and check whether instructions feel manageable." };
    if (participation < 55) return { title: "Build confidence to join in", advice: "Offer a quiet way to contribute, such as a written response or a partner discussion." };
    return { title: "Steady growth", advice: "Notice what is working and keep offering practice with friendly feedback." };
  }

  function clusterLearners(rows) {
    if (!Array.isArray(rows) || rows.length < 3) return { status: "more-data", clusters: [] };

    const vectors = rows.map((row) => FEATURES.map((key) => {
      const raw = row[key];
      const value = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0.5;
    }));
    const unique = [...new Map(vectors.map((vector) => [vector.join(","), vector])).values()];
    if (unique.length < 2) return { status: "similar", clusters: [] };

    const k = Math.min(3, unique.length, Math.max(2, Math.round(Math.sqrt(rows.length / 2))));
    const centers = [unique[0]];
    while (centers.length < k) {
      const next = unique
        .filter((vector) => !centers.includes(vector))
        .map((vector) => ({ vector, distance: Math.min(...centers.map((center) => distanceSquared(vector, center))) }))
        .sort((a, b) => b.distance - a.distance)[0];
      if (!next) break;
      centers.push(next.vector);
    }

    const assignments = new Array(rows.length).fill(-1);
    for (let iteration = 0; iteration < 30; iteration++) {
      let changed = false;
      vectors.forEach((vector, index) => {
        let best = 0, bestDistance = distanceSquared(vector, centers[0]);
        for (let cluster = 1; cluster < centers.length; cluster++) {
          const distance = distanceSquared(vector, centers[cluster]);
          if (distance < bestDistance) { best = cluster; bestDistance = distance; }
        }
        if (assignments[index] !== best) { assignments[index] = best; changed = true; }
      });

      const sums = centers.map(() => Array(FEATURES.length).fill(0));
      const counts = centers.map(() => 0);
      vectors.forEach((vector, index) => {
        const cluster = assignments[index];
        counts[cluster]++;
        vector.forEach((value, feature) => { sums[cluster][feature] += value; });
      });
      centers.forEach((_, cluster) => {
        if (counts[cluster]) centers[cluster] = sums[cluster].map((sum) => sum / counts[cluster]);
      });
      if (!changed) break;
    }

    const clusters = centers.map((centroid, id) => {
      const members = rows.filter((_, index) => assignments[index] === id).map((row) => row.name || "Learner");
      const signals = Object.fromEntries(FEATURES.map((feature, index) => [feature, Math.round(centroid[index] * 100)]));
      return members.length ? { ...describe(centroid), members, size: members.length, signals } : null;
    }).filter(Boolean).sort((a, b) => b.size - a.size);
    return { status: "ready", model: "K-means", clusters };
  }

  return { clusterLearners };
})();


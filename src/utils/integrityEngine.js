/**
 * integrityEngine.js — Core calculations for AI Proctoring & Data Science Analytics
 * Roles: AI Engineer
 */

/**
 * Calculates the proctoring integrity score out of 100.
 * Deductions:
 *   - Tab switching: -8 per event (as in backend config)
 *   - Focus loss: -5 per event
 *   - Browser closed: -50
 *   - Face absent duration: -0.5 per second
 *   - Multiple faces: -5 per event
 *   - Prohibited items (mobile phone / book): -10 per event
 * 
 * Clamps the score between 0 and 100.
 */
export function calculateIntegrityScore(metrics) {
  const {
    tabSwitchCount = 0,
    focusLossCount = 0,
    browserClosed = false,
    faceAbsentDuration = 0,
    multipleFacesCount = 0,
    prohibitedItemsCount = 0
  } = metrics

  let deductions = 0
  deductions += tabSwitchCount * 8
  deductions += focusLossCount * 5
  if (browserClosed) {
    deductions += 50
  }
  deductions += faceAbsentDuration * 0.5
  deductions += multipleFacesCount * 5
  deductions += prohibitedItemsCount * 10

  const finalScore = Math.max(0, Math.min(100, 100 - deductions))
  return Math.round(finalScore * 10) / 10
}

/**
 * Assigns a risk label based on the integrity score.
 */
export function getRiskLabel(score) {
  if (score >= 85) return 'Low Risk'
  if (score >= 70) return 'Medium Risk'
  if (score >= 50) return 'High Risk'
  return 'Critical Risk'
}

/**
 * Calculates the Face Presence Ratio: percentage of exam duration where the face is detected.
 */
export function calculateFacePresenceRatio(totalDurationSeconds, faceAbsentDurationSeconds) {
  if (!totalDurationSeconds || totalDurationSeconds <= 0) return 100
  const presentSec = Math.max(0, totalDurationSeconds - faceAbsentDurationSeconds)
  const ratio = (presentSec / totalDurationSeconds) * 100
  return Math.max(0, Math.min(100, Math.round(ratio * 10) / 10))
}

/**
 * Runs the K-Means clustering algorithm in JS to group exam sessions.
 * Segment sessions into K = 3 cohorts:
 *   - Cluster 0: Compliant (High score, low violations)
 *   - Cluster 1: Careless (Medium score, moderate violations)
 *   - Cluster 2: Suspicious (Low score, high violations)
 * 
 * Clustering dimensions:
 *   - X: Integrity Score (normalized 0.0 to 1.0)
 *   - Y: Total Infractions (normalized 0.0 to 1.0, max 20)
 */
export function runKMeans(sessions, k = 3) {
  // Map sessions to 2D feature coordinates: X = score, Y = weighted infractions
  const data = sessions.map((session, idx) => {
    const score = typeof session.integrityScore === 'number' ? session.integrityScore : 100
    const tabSwitches = session.tabSwitchCount ?? 0
    const focusLosses = session.focusLossCount ?? 0
    const absences = session.faceAbsentCount ?? (session.faceAbsentDuration > 0 ? 1 : 0)
    const items = session.prohibitedItemsCount ?? 0
    const multiFace = session.multipleFacesCount ?? 0
    const totalViolations = tabSwitches + focusLosses + absences + items + multiFace
    
    return {
      id: session.id || `session-${idx}`,
      x: score,
      y: totalViolations,
      session,
      index: idx
    }
  })

  if (data.length === 0) {
    return { clusters: [], centroids: [] }
  }

  // Pre-seed centroids for stable convergence representing our three clusters:
  // Compliant: [96, 0]
  // Careless: [74, 3]
  // Suspicious: [42, 9]
  let centroids = [
    { x: 96, y: 0.2, name: 'Compliant', color: 'success' },
    { x: 74, y: 3.5, name: 'Careless', color: 'warning' },
    { x: 42, y: 10.5, name: 'Suspicious', color: 'danger' }
  ]

  const maxIterations = 15
  let assignments = new Array(data.length).fill(-1)

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let centroidChanged = false

    // Step 1: Assign each point to the nearest centroid (Euclidean distance normalized)
    for (let i = 0; i < data.length; i += 1) {
      const pt = data[i]
      let minDist = Infinity
      let bestCluster = 0

      for (let c = 0; c < k; c += 1) {
        // Normalize X in [0, 100] and Y in [0, 20] so they carry similar weights
        const dx = (pt.x - centroids[c].x) / 100
        const dy = (pt.y - centroids[c].y) / 20
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < minDist) {
          minDist = dist
          bestCluster = c
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster
        centroidChanged = true
      }
    }

    // Step 2: Compute new centroids as average of assigned points
    const sums = Array.from({ length: k }).map(() => ({ x: 0, y: 0, count: 0 }))
    for (let i = 0; i < data.length; i += 1) {
      const c = assignments[i]
      sums[c].x += data[i].x
      sums[c].y += data[i].y
      sums[c].count += 1
    }

    for (let c = 0; c < k; c += 1) {
      if (sums[c].count > 0) {
        const newX = sums[c].x / sums[c].count
        const newY = sums[c].y / sums[c].count
        
        // Check if centroids changed significantly
        if (Math.abs(centroids[c].x - newX) > 0.01 || Math.abs(centroids[c].y - newY) > 0.01) {
          centroids[c].x = newX
          centroids[c].y = newY
          centroidChanged = true
        }
      }
    }

    if (!centroidChanged) break
  }

  // Segment data points into their respective clusters
  const clusters = centroids.map((centroid, cIdx) => {
    const points = data.filter((_, ptIdx) => assignments[ptIdx] === cIdx)
    return {
      clusterId: cIdx,
      name: centroid.name,
      color: centroid.color,
      centroidX: Math.round(centroid.x * 10) / 10,
      centroidY: Math.round(centroid.y * 10) / 10,
      points: points.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        sessionName: p.session.candidateName || p.session.exam || 'Candidate',
        session: p.session
      })),
      percentage: sessions.length ? Math.round((points.length / sessions.length) * 100) : 0
    }
  })

  return { clusters, centroids }
}

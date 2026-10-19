import { readFileSync, writeFileSync } from 'node:fs'

const progressionPath = new URL('./progression.json', import.meta.url)
const entityData = JSON.parse(readFileSync(new URL('./entities.json', import.meta.url), 'utf8'))
const progression = JSON.parse(readFileSync(progressionPath, 'utf8'))
const definitions = new Map(Object.values(entityData.entities).flat().map((entity) => [entity.id, entity]))
const tile = 64
const columnsByTier = [96, 104, 112, 120, 112, 128, 136]
const rowsByTier = [24, 26, 30, 24, 32, 28, 32]
const timeByTier = [72, 82, 90, 95, 100, 105, 110]
const enemyCounts = [[2, 2, 3, 3, 4], [3, 3, 4, 4, 5], [4, 4, 5, 5, 6], [4, 5, 5, 6, 6], [5, 5, 6, 6, 7], [5, 6, 6, 7, 7], [6, 6, 7, 8, 8]]
const hazardCounts = [[3, 3, 4, 4, 5], [3, 4, 4, 5, 5], [4, 4, 5, 6, 6], [4, 5, 5, 6, 7], [5, 5, 6, 7, 7], [5, 6, 7, 7, 8], [6, 7, 7, 8, 9]]
const pickupPools = [
  ['entity_005', 'resource_001', 'resource_004', 'resource_009'],
  ['entity_011', 'resource_002', 'resource_005', 'resource_011'],
  ['entity_020', 'resource_013', 'entity_005'],
  ['resource_008', 'resource_012', 'entity_005'],
  ['resource_003', 'resource_006', 'resource_010'],
  ['resource_007', 'resource_014', 'entity_020'],
  ['resource_014', 'entity_005', 'entity_020'],
]
const enemyPools = [
  ['entity_002', 'entity_003'],
  ['entity_002', 'entity_003', 'entity_014'],
  ['entity_014', 'entity_002', 'entity_003'],
  ['entity_015', 'entity_014', 'entity_003'],
  ['entity_016', 'entity_019', 'entity_014'],
  ['entity_019', 'entity_003', 'entity_014', 'entity_002'],
  ['entity_019', 'entity_016', 'entity_003', 'entity_015'],
]
const hazardPools = [
  ['entity_004'], ['entity_004'], ['entity_013', 'entity_018'],
  ['entity_013', 'entity_018'], ['entity_018', 'entity_013'],
  ['entity_018', 'entity_013'], ['entity_018', 'entity_013'],
]
const routeStyles = [
  { name: 'серпантин', steps: [-1, 0, 1, 0, -1, 0], widths: [6, 4, 5, 3, 7, 4], gaps: [1, 2, 3, 1, 2, 2], branch: 0 },
  { name: 'каскад', steps: [0, -1, -1, 0, 1, 1], widths: [5, 3, 4, 6, 4, 5], gaps: [2, 1, 2, 3, 1, 2], branch: 5 },
  { name: 'гребень', steps: [1, 0, -1, 0, 1, 0], widths: [7, 4, 3, 5, 4, 6], gaps: [1, 3, 2, 1, 2, 3], branch: 4 },
  { name: 'провал', steps: [0, 1, 1, 0, -1, -1], widths: [4, 5, 3, 7, 4, 5], gaps: [2, 1, 3, 2, 1, 2], branch: 0 },
  { name: 'частые уступы', steps: [-1, 1, 0, -1, 1, 0], widths: [3, 4, 3, 5, 4, 6], gaps: [1, 2, 1, 3, 2, 2], branch: 6 },
  { name: 'длинные пролёты', steps: [1, 1, 0, -1, -1, 0], widths: [7, 5, 4, 6, 3, 5], gaps: [3, 2, 3, 1, 2, 3], branch: 0 },
  { name: 'низина и подъём', steps: [0, 1, 0, -1, -1, 0], widths: [5, 6, 3, 4, 7, 3], gaps: [2, 2, 1, 3, 1, 2], branch: 5 },
  { name: 'рваный ритм', steps: [-1, 0, -1, 1, 0, 1], widths: [4, 7, 3, 5, 3, 6], gaps: [2, 3, 1, 2, 3, 1], branch: 4 },
]

const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
const tierIds = (macro, prefix) => macro.entity_ids.filter((id) => id.startsWith(prefix))

function spread(count, candidates) {
  return Array.from({ length: count }, (_item, index) => candidates[Math.floor((index + 0.5) * candidates.length / count)])
}

function buildRoute(columns, rows, style, tier, microIndex, platformIds) {
  const platforms = []
  let col = 2
  let row = rows - 5
  let index = 0
  while (col < columns - 4) {
    const width = Math.min(style.widths[(index + microIndex) % style.widths.length], columns - 3 - col)
    if (width < 3) break
    platforms.push({
      entity_id: platformIds[(index + microIndex) % platformIds.length] ?? 'entity_008',
      col,
      row,
      width_in_tiles: width,
      height_in_tiles: 1,
      route_role: 'main',
    })
    if (col + width >= columns - 3) break
    const gap = style.gaps[(index * 2 + microIndex) % style.gaps.length]
    col += width + gap
    row = clamp(row + style.steps[(index + microIndex) % style.steps.length], 5, rows - 4)
    index += 1
  }

  const branchPlatforms = []
  if (style.branch) {
    for (let mainIndex = style.branch; mainIndex < platforms.length - 2; mainIndex += style.branch) {
      const from = platforms[mainIndex]
      branchPlatforms.push({
        entity_id: 'entity_008',
        col: from.col + from.width_in_tiles - 1,
        row: Math.max(5, from.row - 1),
        width_in_tiles: 2,
        height_in_tiles: 1,
        route_role: 'branch',
      })
    }
  }
  return { platforms, branchPlatforms }
}

function distributeEntities(macro, micro, tierIndex, microIndex) {
  const zones = micro.micro_space?.zones ?? []
  if (!zones.length) throw new Error(`No placement zones: ${micro.micro_level_id}`)
  for (const zone of zones) zone.entities_in_zone = []
  micro.entities_in_zone = []
  const columns = micro.world_or_board.cols
  const main = micro.surface_layout.filter((surface) => surface.route_role === 'main')
  const branches = micro.surface_layout.filter((surface) => surface.route_role === 'branch')
  const checkpointCount = 1 + Math.floor(tierIndex / 2)
  const checkpointPlatforms = spread(checkpointCount, main.slice(2, -2).map((_p, i) => i + 2))
  const checkpointSet = new Set(checkpointPlatforms)
  const reserved = new Map()
  const usedIds = new Set(['entity_001', 'entity_007'])

  function place(entityId, platform, category, extras = {}) {
    const options = Array.from({ length: platform.width_in_tiles }, (_item, i) => platform.col + i)
    const occupied = reserved.get(platform) ?? new Set()
    const col = options.sort((a, b) => Math.abs(a - (extras.preferredCol ?? platform.col + Math.floor(platform.width_in_tiles / 2)))
      - Math.abs(b - (extras.preferredCol ?? platform.col + Math.floor(platform.width_in_tiles / 2))))
      .find((candidate) => [...occupied].every((other) => Math.abs(candidate - other) > 1))
    if (col == null) return false
    occupied.add(col)
    reserved.set(platform, occupied)
    const entity = {
      entity_id: entityId,
      instance_count: 1,
      entity_category: category,
      row: platform.row,
      col,
      ...extras,
    }
    delete entity.preferredCol
    const zoneIndex = clamp(Math.floor(col / columns * zones.length), 0, zones.length - 1)
    zones[zoneIndex].entities_in_zone.push(entity)
    usedIds.add(entityId)
    return entity
  }

  place('entity_001', main[0], 'gameplay', { preferredCol: main[0].col + 1 })
  for (const index of checkpointPlatforms) {
    const platform = main[index]
    place('entity_006', platform, 'gameplay', { preferredCol: platform.col + platform.width_in_tiles - 2 })
  }

  const available = main.map((_p, index) => index).filter((index) => index > 0 && index < main.length - 1 && !checkpointSet.has(index))
  const countHazards = Math.min(hazardCounts[tierIndex][microIndex], available.length + 2)
  const countEnemies = Math.min(enemyCounts[tierIndex][microIndex], available.length + 2)
  const hazardPlatforms = spread(countHazards, available)
  const hazardPlatformSet = new Set(hazardPlatforms)
  const enemyCandidates = [
    ...available.filter((index) => !hazardPlatformSet.has(index)),
    ...available.filter((index) => hazardPlatformSet.has(index) && main[index].width_in_tiles >= 4),
  ]
  const enemyPlatforms = spread(Math.min(countEnemies, enemyCandidates.length), enemyCandidates)
  if (enemyPlatforms.length < countEnemies) throw new Error(`Not enough enemy perches: ${micro.micro_level_id}`)
  const hazardIds = hazardPools[tierIndex]
  const enemyIds = enemyPools[tierIndex]

  hazardPlatforms.forEach((platformIndex, index) => {
    const platform = main[platformIndex]
    const moving = tierIndex >= 2 && (index + microIndex) % 2 === 0
    const hazard = place(hazardIds[(index + microIndex) % hazardIds.length], platform, 'gameplay', {
      motion: moving ? 'sweep' : 'fixed',
      speed: 52 + tierIndex * 7,
      patrol_left_col: platform.col + 1,
      patrol_right_col: platform.col + platform.width_in_tiles - 1,
      preferredCol: platform.col + (index % 2 ? 1 : platform.width_in_tiles - 2),
    })
    if (!hazard) throw new Error(`No safe hazard position: ${micro.micro_level_id}`)
  })

  enemyPlatforms.forEach((platformIndex, index) => {
    const platform = main[platformIndex]
    const id = enemyIds[(index + microIndex) % enemyIds.length]
    const flying = id === 'entity_019'
    const enemy = place(id, platform, 'gameplay', {
      motion: flying ? 'float' : 'patrol',
      speed: 58 + tierIndex * 8 + (index % 2) * 12,
      patrol_left_col: platform.col + 1,
      patrol_right_col: platform.col + platform.width_in_tiles - 1,
      preferredCol: platform.col + (index % 2 ? platform.width_in_tiles - 2 : 1),
    })
    if (!enemy) throw new Error(`No safe enemy position: ${micro.micro_level_id}`)
  })

  const totalPickups = 9 + tierIndex + (microIndex % 3)
  const branchPickups = branches.length ? Math.min(2, branches.length) : 0
  const mainPickupCount = totalPickups - branchPickups
  const pickupIds = pickupPools[tierIndex]
  for (let index = 0; index < mainPickupCount; index += 1) {
    const platformIndex = clamp(1 + Math.floor(index * (main.length - 2) / mainPickupCount), 1, main.length - 2)
    const platform = main[platformIndex]
    const entityId = pickupIds[(index + microIndex) % pickupIds.length]
    const pickup = place(entityId, platform, 'gameplay', { preferredCol: platform.col + 1 + (index % Math.max(1, platform.width_in_tiles - 2)) })
    if (!pickup) {
      const fallback = [...main]
        .sort((a, b) => (reserved.get(a)?.size ?? 0) / a.width_in_tiles - (reserved.get(b)?.size ?? 0) / b.width_in_tiles)
        .find((candidate) => place(entityId, candidate, 'gameplay'))
      if (!fallback) throw new Error(`No safe pickup position: ${micro.micro_level_id}`)
    }
  }
  branches.slice(0, branchPickups).forEach((branch, index) => {
    place(pickupIds[(mainPickupCount + index + microIndex) % pickupIds.length], branch, 'gameplay')
  })

  micro.entities_involved = [...new Set([...(micro.entities_involved ?? []), ...usedIds])]
  return { checkpointCount, totalPickups, requiredSeeds: Math.min(5, mainPickupCount) }
}

function redesign(macro, tierIndex) {
  const platformIds = tierIds(macro, 'platform_location_')
  const wallIds = tierIds(macro, 'wall_location_')
  const parallaxIds = macro.entity_ids.filter((id) => id.startsWith('parallax_'))
  const decorationIds = macro.entity_ids.filter((id) => id.startsWith('env_depth_'))
  if (!platformIds.length || !wallIds.length || !parallaxIds.length || !decorationIds.length) {
    throw new Error(`Missing theme assets for tier ${tierIndex + 1}`)
  }

  macro.level_package.micro_levels.forEach((micro, microIndex) => {
    const styleIndex = (tierIndex * 3 + microIndex) % routeStyles.length
    const style = routeStyles[styleIndex]
    const columns = columnsByTier[tierIndex] + (microIndex % 3) * 4
    const rows = rowsByTier[tierIndex] + (microIndex % 2) * 2
    const route = buildRoute(columns, rows, style, tierIndex, microIndex, platformIds)
    const first = route.platforms[0]
    const last = route.platforms.at(-1)
    const wall = wallIds[microIndex % wallIds.length]
    micro.world_or_board = { ...micro.world_or_board, cols: columns, rows }
    micro.spatial_extent = `${columns}x${rows}`
    micro.start_point = { col: first.col + 1, row: first.row }
    micro.goal_or_exit = {
      col: last.col + last.width_in_tiles - 1,
      row: last.row,
      condition: 'Достичь выхода, собрав необходимое число семян',
    }
    micro.surface_layout = [
      { entity_id: wall, row: 1, col: 0, width_in_tiles: 1, height_in_tiles: rows - 3, route_role: 'boundary' },
      ...route.platforms,
      ...route.branchPlatforms,
    ]
    micro.entities_involved = [...new Set([...(micro.entities_involved ?? []), wall, ...route.platforms.map((p) => p.entity_id), ...route.branchPlatforms.map((p) => p.entity_id)])]
    micro.parallax_layers = [{
      entity_id: parallaxIds[microIndex % parallaxIds.length],
      layer_role: 'background_far',
      render_layer: 'background_far',
      z_index: -100,
      parallax_factor: 0.12 + (microIndex % 3) * 0.04,
      alpha: 0.78,
    }]
    micro.decorative_layout = decorationIds.slice(microIndex % decorationIds.length)
      .slice(0, Math.min(5, decorationIds.length))
      .map((entity_id, index) => ({
        entity_id,
        instance_count: index % 2 ? 2 : 3,
        render_layer: ['background_mid', 'background_near', 'foreground'][index % 3],
        z_index: index * 4,
        has_collision: false,
        parallax_factor: index === 0 ? 0.25 : 0,
        row: clamp(first.row - 3 + index, 3, rows - 4),
        col: Math.round((columns - 8) * (index + 1) / 6),
      }))
    micro.light_sources = [
      { id: `route_${tierIndex + 1}_${microIndex + 1}_light_a`, position: { row: route.platforms[3]?.row - 1 ?? first.row - 1, col: route.platforms[3]?.col ?? first.col + 8 }, color: 'warm_amber', radius: 128, intensity: 0.72, flicker: true },
      { id: `route_${tierIndex + 1}_${microIndex + 1}_light_b`, position: { row: last.row - 1, col: Math.max(first.col, last.col - 5) }, color: 'soft_green', radius: 112, intensity: 0.6, flicker: microIndex % 2 === 0 },
    ]
    const content = distributeEntities(macro, micro, tierIndex, microIndex)
    const base = timeByTier[tierIndex] + microIndex * 4
    micro.resource_limits = { ...micro.resource_limits, time_limit: base }
    micro.route_style = style.name
    micro.objective = `Пройди длинный маршрут «${style.name}», обходя патрули и ловушки.`
    micro.objective_details = [
      `Преодолеть ${route.platforms.length - 1} переходов по живым платформам.`,
      `Собрать не менее ${content.requiredSeeds} семечек из ${content.totalPickups} на маршруте.`,
      `Активировать ${content.checkpointCount} родник и добраться до выхода.`,
    ]
    micro.requirements = [`Пройти маршрут «${style.name}» и собрать ${content.requiredSeeds} семечек.`]
  })
}

function validate() {
  const issues = []
  let platformCount = 0
  let widest = 0
  for (const [tierIndex, macro] of progression.entries()) {
    for (const micro of macro.level_package.micro_levels) {
      const main = micro.surface_layout.filter((surface) => surface.route_role === 'main').sort((a, b) => a.col - b.col)
      const items = (micro.micro_space?.zones ?? []).flatMap((zone) => zone.entities_in_zone ?? [])
      const counts = items.reduce((result, item) => {
        const type = definitions.get(item.entity_id)?.type
        result[type] = (result[type] ?? 0) + item.instance_count
        return result
      }, {})
      const pickups = (counts.collectible ?? 0) + (counts.resource ?? 0)
      const microIndex = micro.sequence_index - 1
      if (counts.enemy !== enemyCounts[tierIndex][microIndex]) issues.push(`${micro.micro_level_id}: enemy count mismatch (${counts.enemy ?? 0})`)
      if (counts.hazard !== hazardCounts[tierIndex][microIndex]) issues.push(`${micro.micro_level_id}: hazard count mismatch (${counts.hazard ?? 0})`)
      if (pickups !== 9 + tierIndex + (microIndex % 3)) issues.push(`${micro.micro_level_id}: pickup count mismatch (${pickups})`)
      const gaps = main.slice(1).map((surface, index) => (surface.col - (main[index].col + main[index].width_in_tiles)) * tile)
      const rises = main.slice(1).map((surface, index) => Math.abs(surface.row - main[index].row) * tile)
      if (main.length < 12) issues.push(`${micro.micro_level_id}: only ${main.length} route platforms`)
      if (gaps.some((gap) => gap > 192)) issues.push(`${micro.micro_level_id}: gap exceeds jump range`)
      if (rises.some((rise) => rise > 64)) issues.push(`${micro.micro_level_id}: height change exceeds one tile`)
      if (pickups < 9) issues.push(`${micro.micro_level_id}: fewer than 9 pickups`)
      if (micro.goal_or_exit.col >= micro.world_or_board.cols - 1) issues.push(`${micro.micro_level_id}: exit outside route bounds`)
      platformCount += main.length
      widest = Math.max(widest, micro.world_or_board.cols)
    }
  }
  if (issues.length) throw new Error(issues.join('\n'))
  return { levels: 35, mainPlatforms: platformCount, maxColumns: widest }
}

progression.forEach(redesign)
const summary = validate()
writeFileSync(progressionPath, `${JSON.stringify(progression, null, 2)}\n`)
console.log(JSON.stringify(summary))

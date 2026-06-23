import { describe, expect, it } from 'vitest';
import { applyGraphScope } from '../../../../src/shared/visibleGraph/scope';
import { edge, ids, node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope plugin symbols', () => {
it('keeps Unity file to GameObject containment when Component symbols are visible', () => {
		const result = applyGraphScope(
			{
				nodes: [
				node('Assets/Prefabs/Enemy1.prefab'),
				symbolNode('Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', {
					id: 'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object',
					name: 'Enemy1',
					kind: 'game-object',
					filePath: 'Assets/Prefabs/Enemy1.prefab',
					pluginKind: 'game-object',
					source: 'codegraphy.unity',
					language: 'unity',
				}),
				symbolNode('Assets/Prefabs/Enemy1.prefab#EnemyMovement:component', {
					id: 'Assets/Prefabs/Enemy1.prefab#EnemyMovement:component',
					name: 'EnemyMovement',
					kind: 'component',
					filePath: 'Assets/Prefabs/Enemy1.prefab',
					pluginKind: 'component',
					source: 'codegraphy.unity',
					language: 'unity',
				}),
			],
			edges: [
					edge('Assets/Prefabs/Enemy1.prefab', 'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', 'contains'),
					edge('Assets/Prefabs/Enemy1.prefab#Enemy1:game-object', 'Assets/Prefabs/Enemy1.prefab#EnemyMovement:component', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'plugin:codegraphy.unity:symbol', enabled: true },
					{ type: 'plugin:codegraphy.unity:symbol:game-object', enabled: true },
					{ type: 'plugin:codegraphy.unity:symbol:component', enabled: true },
				],
				edges: [{ type: 'contains', enabled: true }],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'Assets/Prefabs/Enemy1.prefab',
				'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object',
				'Assets/Prefabs/Enemy1.prefab#EnemyMovement:component',
			],
			edges: [
				'Assets/Prefabs/Enemy1.prefab->Assets/Prefabs/Enemy1.prefab#Enemy1:game-object#contains',
				'Assets/Prefabs/Enemy1.prefab#Enemy1:game-object->Assets/Prefabs/Enemy1.prefab#EnemyMovement:component#contains',
			],
		});
	});

	it('projects hidden symbol endpoints back to visible containing files', () => {
		const result = applyGraphScope(
			{
				nodes: [
				node('scripts/spawning/enemy_spawner.gd'),
				node('resources/enemy_spawn_config.tres'),
				symbolNode('resources/enemy_spawn_config.tres#EnemySpawnConfig:resource', {
					id: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
					name: 'EnemySpawnConfig',
					kind: 'resource',
					filePath: 'resources/enemy_spawn_config.tres',
					pluginKind: 'resource',
					source: 'codegraphy.gdscript',
				}),
			],
			edges: [{
				id: 'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#EnemySpawnConfig:resource#load:static',
				from: 'scripts/spawning/enemy_spawner.gd',
				to: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
					kind: 'load',
					sources: [],
				}],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: false },
					{ type: 'plugin:codegraphy.gdscript:symbol:resource', enabled: false },
				],
				edges: [
					{ type: 'load', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'scripts/spawning/enemy_spawner.gd',
				'resources/enemy_spawn_config.tres',
			],
			edges: [
				'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#load:static',
			],
		});
	});
	it('uses the most specific plugin symbol rule before a general symbol kind rule', () => {
	const result = applyGraphScope(
		{
			nodes: [
				node('src/user.ts'),
				symbolNode('src/user.ts#User:class', {
					id: 'src/user.ts#User:class',
					name: 'User',
					kind: 'class',
					filePath: 'src/user.ts',
				}),
				symbolNode('scripts/player.gd#Player:class', {
					id: 'scripts/player.gd#Player:class',
					name: 'Player',
					kind: 'class',
					filePath: 'scripts/player.gd',
					pluginKind: 'godot-class-name',
					source: 'codegraphy.gdscript',
					language: 'gdscript',
				}),
			],
			edges: [
				edge('src/user.ts', 'src/user.ts#User:class', 'contains'),
				edge('src/user.ts', 'scripts/player.gd#Player:class', 'reference'),
			],
		},
		{
			nodes: [
				{ type: 'file', enabled: true },
				{ type: 'symbol', enabled: true },
				{ type: 'symbol:class', enabled: true },
				{ type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
			],
			edges: [
				{ type: 'contains', enabled: true },
				{ type: 'reference', enabled: true },
			],
		},
	);

	expect(ids(result)).toEqual({
		nodes: ['src/user.ts', 'src/user.ts#User:class'],
		edges: ['src/user.ts->src/user.ts#User:class#contains'],
	});
	});

	it('matches Godot scene-node and exported-property scoped rows', () => {
	const result = applyGraphScope(
		{
			nodes: [
				node('scenes/player.tscn'),
				node('scripts/player.gd'),
				symbolNode('scenes/player.tscn#HealthComponent:scene-node', {
					id: 'scenes/player.tscn#HealthComponent:scene-node',
					name: 'HealthComponent',
					kind: 'scene-node',
					filePath: 'scenes/player.tscn',
					pluginKind: 'scene-node',
					source: 'codegraphy.gdscript',
					language: 'godot-resource',
				}),
				symbolNode('scripts/player.gd#projectile_scene:variable', {
					id: 'scripts/player.gd#projectile_scene:variable',
					name: 'projectile_scene',
					kind: 'variable',
					filePath: 'scripts/player.gd',
					pluginKind: 'exported-property',
					source: 'codegraphy.gdscript',
					language: 'gdscript',
				}, 'variable'),
				symbolNode('scripts/player.gd#_can_fire:variable', {
					id: 'scripts/player.gd#_can_fire:variable',
					name: '_can_fire',
					kind: 'variable',
					filePath: 'scripts/player.gd',
					source: 'codegraphy.gdscript',
					language: 'gdscript',
				}, 'variable'),
			],
			edges: [
				edge('scenes/player.tscn', 'scenes/player.tscn#HealthComponent:scene-node', 'contains'),
				edge('scripts/player.gd', 'scripts/player.gd#projectile_scene:variable', 'contains'),
				edge('scripts/player.gd', 'scripts/player.gd#_can_fire:variable', 'contains'),
			],
		},
		{
			nodes: [
				{ type: 'file', enabled: true },
				{ type: 'symbol', enabled: true },
				{ type: 'variable', enabled: true },
				{ type: 'plugin:codegraphy.gdscript:symbol:scene-node', enabled: true },
				{ type: 'plugin:codegraphy.gdscript:symbol:exported-property', enabled: true },
			],
			edges: [
				{ type: 'contains', enabled: true },
			],
		},
	);

	expect(ids(result)).toEqual({
			nodes: [
				'scenes/player.tscn',
				'scripts/player.gd',
				'scenes/player.tscn#HealthComponent:scene-node',
				'scripts/player.gd#projectile_scene:variable',
			],
			edges: [
				'scenes/player.tscn->scenes/player.tscn#HealthComponent:scene-node#contains',
				'scripts/player.gd->scripts/player.gd#projectile_scene:variable#contains',
			],
		});
	});

	it('requires every plugin-specific symbol field to match', () => {
	const matching = symbolNode('scripts/player.gd#Player:class', {
		id: 'scripts/player.gd#Player:class',
		name: 'Player',
		kind: 'class',
		filePath: 'scripts/player.gd',
		pluginKind: 'godot-class-name',
		source: 'codegraphy.gdscript',
		language: 'gdscript',
	});
	const wrongPluginKind = symbolNode('scripts/enemy.gd#Enemy:class', {
		id: 'scripts/enemy.gd#Enemy:class',
		name: 'Enemy',
		kind: 'class',
		filePath: 'scripts/enemy.gd',
		pluginKind: 'ordinary-class',
		source: 'codegraphy.gdscript',
		language: 'gdscript',
	});
	const wrongSource = symbolNode('scripts/npc.gd#Npc:class', {
		id: 'scripts/npc.gd#Npc:class',
		name: 'Npc',
		kind: 'class',
		filePath: 'scripts/npc.gd',
		pluginKind: 'godot-class-name',
		source: 'other-plugin',
		language: 'gdscript',
	});
	const wrongLanguage = symbolNode('scripts/item.gd#Item:class', {
		id: 'scripts/item.gd#Item:class',
		name: 'Item',
		kind: 'class',
		filePath: 'scripts/item.gd',
		pluginKind: 'godot-class-name',
		source: 'codegraphy.gdscript',
		language: 'typescript',
	});
	const wrongFilePath = symbolNode('src/player.ts#Player:class', {
		id: 'src/player.ts#Player:class',
		name: 'Player',
		kind: 'class',
		filePath: 'src/player.ts',
		pluginKind: 'godot-class-name',
		source: 'codegraphy.gdscript',
		language: 'gdscript',
	});

	const result = applyGraphScope(
		{
			nodes: [
				matching,
				wrongPluginKind,
				wrongSource,
				wrongLanguage,
				wrongFilePath,
			],
			edges: [],
		},
		{
			nodes: [
				{ type: 'symbol', enabled: true },
				{ type: 'symbol:class', enabled: false },
				{ type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: true },
			],
			edges: [],
		},
	);

	expect(ids(result)).toEqual({
		nodes: ['scripts/player.gd#Player:class'],
		edges: [],
	});
	});


	it('filters Unity component symbols through plugin scope rows', () => {
	const result = applyGraphScope(
		{
			nodes: [
				node('Assets/Scenes/SampleScene.unity'),
				symbolNode('Assets/Scenes/SampleScene.unity#unity:game-object:1000', {
					id: 'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
					name: 'Player',
					kind: 'game-object',
					filePath: 'Assets/Scenes/SampleScene.unity',
					pluginKind: 'game-object',
					source: 'codegraphy.unity',
					language: 'unity',
				}),
				symbolNode('Assets/Scenes/SampleScene.unity#unity:component:1001', {
					id: 'Assets/Scenes/SampleScene.unity#unity:component:1001',
					name: 'Transform',
					kind: 'component',
					filePath: 'Assets/Scenes/SampleScene.unity',
					pluginKind: 'component',
					source: 'codegraphy.unity',
					language: 'unity',
				}),
			],
			edges: [
				edge(
					'Assets/Scenes/SampleScene.unity',
					'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
					'contains',
				),
				edge(
					'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
					'Assets/Scenes/SampleScene.unity#unity:component:1001',
					'contains',
				),
			],
		},
		{
			nodes: [
				{ type: 'file', enabled: true },
				{ type: 'symbol', enabled: true },
				{ type: 'plugin:codegraphy.unity:symbol', enabled: true },
				{ type: 'plugin:codegraphy.unity:symbol:game-object', enabled: true },
				{ type: 'plugin:codegraphy.unity:symbol:component', enabled: false },
			],
			edges: [{ type: 'contains', enabled: true }],
		},
	);

	expect(ids(result)).toEqual({
		nodes: [
			'Assets/Scenes/SampleScene.unity',
			'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
		],
		edges: [
			'Assets/Scenes/SampleScene.unity->Assets/Scenes/SampleScene.unity#unity:game-object:1000#contains',
		],
	});
	});
});

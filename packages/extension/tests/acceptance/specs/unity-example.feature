Feature: Unity Example

  Scenario: Unity example renders file, code, prefab, scene, and event relationships
    Given I open the examples/example-unity workspace in VS Code
    When I open the CodeGraphy extension graph view
    And I have indexed the workspace
    Then I see graph nodes
    And I show no edge types
    Then I can see there are 36 nodes and 0 connections

    When I click the plugins button
    Then I see a list of plugins with toggles
    And I toggle the Unity plugin on
    When I click the Graph Scope button
    And I select edge types
    Then the available edge types are Using, Type, References, Call, Inherits, Implements, Events, Contains
    And I select node types
    Then I see a list of node types with toggles
    And I close the Graph Scope

    When I toggle the Using edge on
    Then I show only the File and Package node types
    Then I can see there are 41 nodes and 17 connections
    And Assets/Scripts/Player/PlayerMovement.cs points to pkg:UnityEngine.InputSystem
    And Assets/Scripts/EventDemoButton.cs points to pkg:UnityEngine.Events

    Then I show only the Inherits edge type
    Then I can see there are 41 nodes and 14 connections
    And Assets/Scripts/Player/PlayerHealth.cs points to Assets/Scripts/Health.cs
    And Assets/Scripts/Enemy/EnemyMovement.cs points to Assets/Scripts/Movement.cs

    Then I show only the Implements edge type
    Then I can see there are 41 nodes and 1 connection
    And Assets/Scripts/Enemy/EnemyMovement.cs points to Assets/Scripts/Enemy/IEnemyLifecycle.cs

    Then I show only the Call edge type
    Then I can see there are 41 nodes and 4 connections
    And Assets/Scripts/Health.cs points to Assets/Scripts/HealthBar.cs
    And Assets/Scripts/Player/PlayerMovement.cs points to Assets/Scripts/Movement.cs

    Then I show only the Events edge type
    Then I can see there are 41 nodes and 1 connection
    And Assets/Scenes/SampleScene.unity points to Assets/Scripts/ControlsHint.cs

    Then I show only the References edge type
    Then I can see there are 41 nodes and 30 connections
    And Assets/Scenes/SampleScene.unity points to Assets/Prefabs/Player.prefab
    And Assets/ScriptableObjects/Enemy1.asset points to Assets/Prefabs/Enemy1.prefab
    And Assets/Prefabs/Player.prefab points to Assets/Prefabs/Bullet.prefab

    Then I show only the Contains edge type
    Then I show only the File, Unity, GameObject and Component node types
    Then I can see there are 135 nodes and 99 connections
    And the visible graph includes the GameObject node Player from Assets/Prefabs/Player.prefab
    And the visible graph includes the Component node PlayerMovement from Assets/Prefabs/Player.prefab
    And Assets/Prefabs/Player.prefab points to Assets/Prefabs/Player.prefab#Player:game-object:GameObject%209198981909421160485
    And Assets/Prefabs/Player.prefab#Player:game-object:GameObject%209198981909421160485 points to Assets/Prefabs/Player.prefab#PlayerMovement:component:MonoBehaviour

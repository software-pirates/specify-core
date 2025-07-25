@manual
Feature: Watch Mode
    As a software developer
    I want to run tests in watch mode that automatically rerun when files change
    So that I can get immediate feedback during development without manually rerunning tests

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And that a command line prompt is available

    Rule: Watch mode monitors file changes and reruns tests automatically

        @skip
        Scenario: Watch mode starts and monitors for changes
            Given that a "passing feature" file exists at "./features"
            When a user runs the command "npx specify test --watch"
            Then the command should start in watch mode
            And the console output should include "Watching for file changes"
            And the initial test run should complete with a "success" status code

        @skip
        Scenario: Test reruns automatically when feature file changes
            Given that a "passing feature" file exists at "./features"
            And that watch mode is running
            When the feature file is modified
            Then the tests should automatically rerun

        @skip
        Scenario: Test reruns automatically when step definition changes
            Given that a "passing feature" file exists at "./features"
            And that a custom step definition file exists at "./features/steps"
            And that watch mode is running
            When the step definition file is modified
            Then the tests should automatically rerun

    Rule: Watch mode can be combined with other options

        @skip
        Scenario: Watch mode with retry option
            Given that a "flaky feature" file exists at "./features"
            When a user runs the command "npx specify test --watch --retry 2"
            Then the command should start in watch mode
            And failed tests should be retried according to the retry setting

        @skip
        Scenario: Watch mode with parallel execution
            Given that multiple "passing feature" files exist at "./features"
            When a user runs the command "npx specify test --watch --parallel 2"
            Then the command should start in watch mode
            And tests should run in parallel according to the parallel setting

        @skip
        Scenario: Watch mode with tag filtering
            Given that a "tagged feature" file exists at "./features"
            When a user runs the command "npx specify test --watch --tags '@smoke'"
            Then the command should start in watch mode
            And only tests matching the tag filter should run

    Rule: Watch mode handles file system events appropriately

        @skip
        Scenario: Watch mode ignores temporary files
            Given that a "passing feature" file exists at "./features"
            And that watch mode is running
            When a temporary file is created in "./features"
            Then the tests should not rerun

        @skip
        Scenario: Watch mode handles file deletion gracefully
            Given that a "passing feature" file exists at "./features/deleteme.feature"
            And that watch mode is running
            When "./features/deleteme.feature" is deleted
            Then the tests should automatically rerun

        @skip
        Scenario: Watch mode handles new file creation
            Given that watch mode is running for "./features"
            When a new feature file is created at "./features/newtest.feature"
            Then the tests should automatically rerun
            And the new test should be included in the test run

    Rule: Watch mode can be stopped gracefully

        @skip
        Scenario: Watch mode stops on user interrupt
            Given that watch mode is running
            When the user sends a SIGINT signal (Ctrl+C)
            Then the watch mode should stop gracefully
            And the console output should include "Watch mode stopped"

        @skip
        Scenario: Watch mode exits with error status when interrupted during test run
            Given that a "long running feature" file exists at "./features"
            And that watch mode is running
            When the user sends a SIGINT signal during test execution
            Then the watch mode should stop gracefully
            And the command should exit with an appropriate status code

    Rule: Watch mode option validation

        @skip
        Scenario: Watch mode conflicts with rerun option
            When a user runs the command "npx specify test --watch --rerun"
            Then the command should exit with an "error" status code
            And the console output should include "conflicting options"

        @skip
        Scenario: Watch mode requires valid file paths
            When a user runs the command "npx specify test --watch ./nonexistent/path"
            Then the command should exit with an "error" status code
            And the console output should include "path not found error"
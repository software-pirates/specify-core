Feature: Rerun Failed Tests
    As a software developer
    I want to rerun previously failed tests
    In order to verify that changes I've made fixed the cause of the failure

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And a CLI shell

    Rule: Failed tests can be targeted for reruns

        @skip
        Scenario: Only failed tests are rerun
            Given that a "passing feature" file exists at "./features"
            And that a "failing feature" file exists at "./features"
            When a user runs the command "npx specify test"
            And a user runs the command "npx specify test --rerun"
            Then the command should return a "failure" exit code
            And the console output should include "failing test result"
            And the console output should not include "passing test result"

        @skip
        Scenario: No tests are rerun after a 100% passing run
            Given that a "passing feature" file exists at "./features"
            When a user runs the command "npx specify test"
            And a user runs the command "npx specify test --rerun"
            Then the command should return an "error" exit code
            And the console output should be a "no tests to rerun"
        
        @skip
        Scenario: A previously failing test passes after a rerun
            Given that a "failing feature" file exists at "./features"
            When a user runs the command "npx specify test"
            And the code under test is modified so the issue is resolved
            And the user runs the command "npx specify test --rerun"
            Then the command should return a "success" exit code
            And the console output should include "passing test result"

        @skip
        Scenario: Rerun is attempted with no prior test run
            Given that a "failing feature" file exists at "./features"
            When the user runs the command "npx specify test --rerun"
            Then the command should return an "error" exit code
            And the console output should be a "no tests to rerun"

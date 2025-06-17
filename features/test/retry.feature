Feature: Retry Flaky Tests
    As a software developer
    I want to run automated tests that retry automatically on failure
    In order to ensure that flaky tests don't trigger alarms for transitory issues

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And that a command line prompt is available

    @skip @todo
    Scenario: The default value for the retry is ???

    @skip @todo
    Scenario: The retry-tag option can/cannot be used without the retry option

    Rule: Flaky tests can be retried and any success among retries counts as passing

        @skip
        Scenario: A test run that fails with 2 retries
            Given that a "3rd retry passing feature" file exists at "./features"
            When a user runs the command "npx specify test --retry 2"
            Then the command should exit with a "failure" status code

        @skip
        Scenario: A test run that passes with 3 retries
            Given that a "3rd retry passing feature" file exists at "./features"
            When a user runs the command "npx specify test --retry 3"
            Then the command should exit with a "success" status code

    Rule: Tags can be used to limit retries to specific tests

        @skip
        Scenario: Retry-tag limits retries to matching tagged tests
            Given that a "3rd retry passing feature" file exists at "./features"
            And that a "5 second failing feature" file exists at "./features"
            When a user runs the command "npx specify test --retry 3 --retry-tag '@retry'"
            Then the command should exit with a "failure" status code
            And the elapsed time should be less than "10" seconds
    
    Rule: Retry option only accepts a single integer argument

        @skip
        Scenario: Multiple integers are rejected
            When a user runs the command "npx specify test --retry 1 2"
            Then the command should exit with an "error" status code
            And the console output should be a "help message"
        
        @skip
        Scenario: Floats are rejected
            When a user runs the command "npx specify test --retry 0.5"
            Then the command should exit with an "error" status code
            And the console output should be a "help message"
        
        @skip
        Scenario: Text is rejected
            When a user runs the command "npx specify test --retry 'bad-value'"
            Then the command should exit with an "error" status code
            And the console output should be a "help message"
    
    Rule: Retry-tag option must be a valid tag

        @skip
        Scenario: Invalid tags are rejected
            When a user runs the command "npx specify test --retry-tag 'bad-tag'"
            Then the command should exit with an "error" status code
            And the console output should be a "help message"
    
    @skip @todo
    Scenario: A retry value of 0 disables retries

    @skip @todo
    Scenario: An excessively high retry value is rejected (or handled gracefully) 

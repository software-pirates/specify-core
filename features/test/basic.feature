Feature: Basic Test Execution
    As a software developer
    I want to run automated tests based on Gherkin behavior specs
    In order to ensure that my software functions as the specs say it should

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And that a command line prompt is available

    Rule: The run should succeed only if all tests pass

        Scenario: All tests pass
            When a user runs the command "npx specify test ./assets/gherkin/binary/passing.feature"
            Then the command should exit with a "success" status code
            And the console output should be a "passing test result"

        Scenario: All tests fail
            When a user runs the command "npx specify test ./assets/gherkin/binary/failing.feature"
            Then the command should exit with a "failure" status code
            And the console output should be a "failing test result"

        Scenario: Mixed pass/fail tests
            When a user runs the command "npx specify test ./assets/gherkin/binary/"
            Then the command should exit with a "failure" status code

    Rule: The run should error if there are invalid features

        @skip @dependency
        Scenario: Feature has a Gherkin syntax error
            When a user runs the command "npx specify test ./assets/gherkin/invalid.feature"
            Then the command should exit with an "error" status code

        @skip @dependency
        Scenario: Feature contains undefined step definitions
            When a user runs the command "npx specify test ./assets/gherkin/undefined.feature"
            Then the command should exit with an "error" status code

    Rule: The run should error if there are no available tests

        @skip
        Scenario: User-specified path does not exist
            When a user runs the command "npx specify test ./nonexistent/path/"
            Then the command should exit with a "error" status code
            And the console output should be a "path not found error"

        @skip
        Scenario: User-specified path is empty
            When a user runs the command "npx specify test ./assets/gherkin/empty/"
            Then the command should exit with a "error" status code
            And the console output should be a "no test cases error"

        @skip
        Scenario: User-specified path contains no features
            When a user runs the command "npx specify test ./assets/gherkin/no-features/test.md"
            Then the command should exit with a "error" status code
            And the console output should be a "no test cases error"
        
        @skip
        Scenario: User-specified path contains no scenarios
            When a user runs the command "npx specify test ./assets/gherkin/empty.feature"
            Then the command should exit with an "failure" status code
            And the console output should be a "no test cases error"

    Rule: Execution without a subcommand should default to testing

        Scenario: Passing test without subcommand
            When a user runs the command "npx specify ./assets/gherkin/binary/passing.feature"
            Then the command should exit with a "success" status code

    Rule: Users can run subsets of tests by path or tag

        Scenario: Only run tests with the specified tag
            When a user runs the command "npx specify test --tags '@pass' ./assets/gherkin/binary/"
            Then the command should exit with a "success" status code
        
        Scenario: Do not run tests with the specified inverted tag
            When a user runs the command "npx specify test --tags 'not @fail' ./assets/gherkin/binary/"
            Then the command should exit with a "success" status code

        Scenario: Unmatched tags cause an error
            When a user runs the command "npx specify test --tags '@nevermatch'"
            Then the command should exit with a "error" status code
            And the console output should be a "no test cases error"

    Rule: Invalid commands display usage help

        @skip
        Scenario: Unsupported subcommand
            When a user runs the command "npx specify bad-subcommand"
            Then the command should exit with a "failure" status code
            And the console output should be a "invalid command message"

        @skip
        Scenario: Unsupported option
            When a user runs the command "npx specify --bad-option"
            Then the command should exit with a "failure" status code
            And the console output should be a "invalid command message"

        @skip
        Scenario: Mix of supported and unsupported options
            When a user runs the command "npx specify --tag '@pass' --bad-option"
            Then the command should exit with a "failure" status code
            And the console output should be a "invalid command message"

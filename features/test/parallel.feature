Feature: Parallel Execution
    As a software developer
    I want to run tests in parallel
    So that testing is faster and more efficient

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And a CLI shell

    Rule: Tests run serially by default

        @skip
        Scenario: Serial execution takes more than 10 seconds
            When a user runs the command "npx specify test ./assets/gherkin/slow/"
            Then the command should return a $failure exit code
            And the elapsed time should be greater than 10 seconds

    Rule: Tests can be run in parallel

        @skip
        Scenario: Parallel execution takes less than 6 seconds
            When a user runs the command "npx specify test --parallel 2 ./assets/gherkin/slow/"
            Then the command should return a $failure exit code
            And the elapsed time should be less than 6 seconds

        @skip @review
        Scenario: Parallel option defaults to a value of one less than total CPU cores
            When a user runs the command "npx specify test --parallel"
            Then the command should return a $success exit code
            And the elapsed time should be less than 6 seconds

    Rule: Parallel option only accepts a single integer argument

        @skip
        Scenario: Floats are rejected
            When a user runs the command "npx specify test --parallel 0.5"
            Then the command should return an $error exit code
            And the console output should match "help message"

        @skip
        Scenario: Non-numeric values are rejected
            When a user runs the command "npx specify test --parallel 'bad-value'"
            Then the command should return an $error exit code
            And the console output should match "help message"

        @skip @todo
        Scenario: A value of 0 is equivalent to no limit

        @skip @todo
        Scenario: An excessively high value is rejected (or handled gracefully) 

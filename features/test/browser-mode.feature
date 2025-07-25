Feature: Browser Testing Mode
    As a software developer
    I want to control how browser tests are executed
    So that I can prioritize system resource usage and test observability according to my needs and preferences

    Background:
        Given that the "@specify/core" NPM package is installed
        And that the "@specify/plugin-browser" NPM package is installed
        And that the "@specify/plugin-cli" NPM package is installed
        And a CLI shell
        And that a "passing browser feature" file exists at "./features"

    Rule: Headless mode is the default browser testing mode

        @skip @manual
        Scenario: Headless testing is the default
            When a user runs the command "npx specify test" and waits for it to complete
            Then a browser window should not open
            And the command should return a "success" exit code

    Rule: Headless mode testing is local and non-visible

        @skip @manual
        Scenario: Headless testing is local
            When a user runs the command "npx specify test --headless" and waits for it to complete
            Then the command should return a "success" exit code
            And the test ran locally

        @skip @manual
        Scenario: Headless testing is not visible
            When a user runs the command "npx specify test --headless" and waits for it to complete
            Then a browser window should not open
    
    Rule: Visual mode testing is local and visible

        @skip @manual
        Scenario: Visual testing is local
            When a user runs the command "npx specify test --visual" and waits for it to complete
            Then the command should return a "success" exit code
            And the test ran locally
        
        @skip @manual
        Scenario: Visual testing is visible
            When a user runs the command "npx specify test --visual" and waits for it to complete
            Then a browser window should open

    Rule: Grid mode testing is remote

        @skip @manual
        Scenario: Grid testing is remote
            Given that a Selenium Grid is available at "http://localhost:4444"
            When a user runs the command "npx specify test --grid http://localhost:4444" and waits for it to complete
            Then the Selenium Grid should execute the tests
            And the command should return a "success" exit code

        @skip @manual
        Scenario: Grid testing fails without a grid
            Given that a Selenium Grid is not available at "http://localhost:4444"
            When the user runs the command "npx specify test --grid http://localhost:4444" and waits for it to complete
            Then the command should return an "error" exit code
            And the console output should include "unable to connect to Selenium Grid"
        
        @skip @todo @manual
        Scenario: Grid option defaults to ???

    Rule: Conflicting browser mode options are not valid

        @skip
        Scenario: Using both --visual and --headless
            When a user runs the command "npx specify test --visual --headless" and waits for it to complete
            Then the command should return an "error" exit code
            And the console output should include "conflicting browser mode options"
        
        @skip
        Scenario: Using both --visual and --grid
            When a user runs the command "npx specify test --visual --grid" and waits for it to complete
            Then the command should return an "error" exit code
            And the console output should include "conflicting browser mode options"

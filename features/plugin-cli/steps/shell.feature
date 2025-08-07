Feature: Shell Step Definitions
    As a software developer interested in using Specify to test CLI programs
    I want to be able to manage and interact with OS shells
    So that I can issue commands and validate the expected responses

    Rule: I can create and destroy shells

        Scenario: Create a single shell
            When the user starts a CLI shell
            # Then there should be 1 active CLI shell

        Scenario: Create multiple shells
            Given a CLI shell
            When the user starts another CLI shell
            # Then there should be 2 active CLI shells

        # Scenario: Create and destroy a single shell
        #     Given a CLI shell
        #     When the user kills a CLI shell
        #     Then there should be 0 active CLI shells

        # Scenario: Create and destroy multiple shells
        #     Given a CLI shell
        #     And another CLI shell
        #     When the user kills a CLI shell
        #     Then there should be 1 active CLI shell
        #     When the user kills another CLI shell
        #     Then there should be 0 active CLI shells

    Rule: I can execute commands and verify results

        Scenario: Execute an asynchronous command and verify exit status
            Given a CLI shell
            When the user starts the async command "for num in $(seq 1 3); do sleep 1; echo $num; done"
            And the user waits for the last command to return
            Then the last command's exit code should be a 0

        Scenario: Execute an asynchronous command and verify terminal output
            Given a CLI shell
            When the user starts the async command "for num in $(seq 1 3); do sleep 1; echo $num; done"
            And the user waits for the last command to return
            Then the last command's terminal output should match "^1\n2\n3$"

        Scenario: Execute a synchronous command and verify exit status
            Given a CLI shell
            When the user runs the command "echo foo"
            Then the last command's exit code should be a 0

        Scenario: Execute a synchronous command and verify terminal output
            Given a CLI shell
            When the user runs the command "echo foo"
            Then the last command's terminal output should match "^foo$"

        Scenario: Start a persistent process and wait for any terminal output
            Given a CLI shell
            When the user starts the async command "echo foo; sleep 2; echo bar"
            And the user waits for terminal output
            Then the last command's terminal output should match "^foo$"

        Scenario: Start a persistent process and wait for any terminal output on STDOUT
            Given a CLI shell
            When the user starts the async command "echo foo >&2; sleep 2; echo bar"
            And the user waits for terminal output on STDOUT
            Then the last command's terminal output should match "^foo\nbar$"

        Scenario: Start a persistent process and wait for any terminal output on STDERR
            Given a CLI shell
            When the user starts the async command "echo foo; sleep 2; echo bar >&2"
            And the user waits for terminal output on STDERR
            Then the last command's terminal output should match "^foo\nbar$"

        Scenario: Start a persistent process and wait for specific terminal output
            Given a CLI shell
            When the user starts the async command "echo foo; sleep 2; echo bar"
            And the user waits for terminal output matching "bar"
            Then the last command's terminal output should match "^foo\nbar$"

        Scenario: Start a persistent process and wait for specific terminal output on STDOUT
            Given a CLI shell
            When the user starts the async command "echo foo; echo bar >&2; sleep 2; echo baz"
            And the user waits for terminal output on STDOUT matching "baz"
            Then the last command's terminal output should match "^foo\nbar\nbaz$"

        Scenario: Start a persistent process and wait for specific terminal output on STDERR
            Given a CLI shell
            When the user starts the async command "echo foo; echo bar >&2; sleep 2; echo baz >&2"
            And the user waits for terminal output on STDERR matching "baz"
            Then the last command's terminal output should match "^foo\nbar\nbaz$"

    Rule: I can swap between shells and run commands in parallel

        # Scenario: Swap between shells in sequence

        # Scenario: Swap between shells by index

        # Scenario: Swap between shells by name

        # Scenario: Execute commands in parallel

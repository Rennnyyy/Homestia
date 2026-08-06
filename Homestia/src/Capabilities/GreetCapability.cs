using Aletheia.Sdk.Capability;
using Aletheia.Sdk.Execution;

namespace Aletheia.Sdk.Program.Capabilities;

/// <summary>
/// Inbound command: greet a visitor by name.
/// </summary>
public sealed record GreetCommand(string Name);

/// <summary>
/// The greeting response returned to the caller.
/// </summary>
public sealed record GreetResponse(string Message);

/// <summary>
/// GreetHandler — the canonical "hello world" capability.
/// Demonstrates the <see cref="ICapabilityHandler{TCommand,TResponse}"/> pattern:
/// receive a command, return an <see cref="ExecutionResult{T}"/>.
/// </summary>
[Capability("program.greet")]
public sealed class GreetHandler : ICapabilityHandler<GreetCommand, GreetResponse>
{
    public ValueTask<ExecutionResult<GreetResponse>> HandleAsync(
        GreetCommand command,
        CapabilityContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            return ValueTask.FromResult<ExecutionResult<GreetResponse>>(
                new ExecutionResult<GreetResponse>.Fail(
                    new ExecutionError("EMPTY_NAME", "A name is required.")));
        }

        var message = $"Welcome, {command.Name}. The Homestia program is running on Aletheia.";
        return ValueTask.FromResult<ExecutionResult<GreetResponse>>(
            new ExecutionResult<GreetResponse>.Ok(new GreetResponse(message)));
    }
}

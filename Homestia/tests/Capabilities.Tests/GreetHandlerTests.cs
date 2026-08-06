using Aletheia.Sdk.Capability;
using Aletheia.Sdk.Execution;
using Shouldly;

namespace Aletheia.Sdk.Program.Capabilities.Tests;

/// <summary>
/// Unit tests for <see cref="GreetHandler"/> — validates command handling,
/// success and failure paths, without requiring a running server.
/// </summary>
public sealed class GreetHandlerTests
{
    private readonly GreetHandler _handler = new();

    [Fact]
    public async Task Handle_with_valid_name_returns_ok_result()
    {
        var command = new GreetCommand("World");
        var context = new CapabilityContext();

        var result = await _handler.HandleAsync(command, context);

        result.ShouldBeOfType<ExecutionResult<GreetResponse>.Ok>();
        var ok = (ExecutionResult<GreetResponse>.Ok)result;
        ok.Response.Message.ShouldContain("World");
        ok.Response.Message.ShouldContain("Homestia");
    }

    [Fact]
    public async Task Handle_with_empty_name_returns_fail_result()
    {
        var command = new GreetCommand("");
        var context = new CapabilityContext();

        var result = await _handler.HandleAsync(command, context);

        result.ShouldBeOfType<ExecutionResult<GreetResponse>.Fail>();
        var fail = (ExecutionResult<GreetResponse>.Fail)result;
        fail.Error.Code.ShouldBe("EMPTY_NAME");
    }

    [Fact]
    public async Task Handle_with_whitespace_name_returns_fail_result()
    {
        var command = new GreetCommand("   ");
        var context = new CapabilityContext();

        var result = await _handler.HandleAsync(command, context);

        result.ShouldBeOfType<ExecutionResult<GreetResponse>.Fail>();
        var fail = (ExecutionResult<GreetResponse>.Fail)result;
        fail.Error.Code.ShouldBe("EMPTY_NAME");
    }

    [Fact]
    public void GreetCommand_record_has_expected_shape()
    {
        var command = new GreetCommand("Test");

        command.Name.ShouldBe("Test");
    }

    [Fact]
    public void GreetResponse_record_has_expected_shape()
    {
        var response = new GreetResponse("Hello!");

        response.Message.ShouldBe("Hello!");
    }

    [Fact]
    public void Capability_attribute_is_present_with_correct_identity()
    {
        var attribute = (CapabilityAttribute)Attribute.GetCustomAttribute(
            typeof(GreetHandler), typeof(CapabilityAttribute))!;

        attribute.ShouldNotBeNull();
        attribute.Identity.Value.ShouldBe("program.greet");
    }
}

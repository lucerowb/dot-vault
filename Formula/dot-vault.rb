class DotVault < Formula
  desc "CLI for DotVault — secure environment variable management"
  homepage "https://github.com/lucerowb/dot-vault/tree/main/packages/cli"
  url "https://github.com/lucerowb/dot-vault/releases/download/v0.2.9/dotvault-cli-0.2.9.npm.tgz"
  version "0.2.9"
  sha256 "d2880aff42e98babc5a169932388854b17351a67bb822bfc5ac3aaee6fb99b6e"
  license "MIT"

  livecheck do
    url :stable
    strategy :github_latest
  end

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    ENV["NO_COLOR"] = "1"

    assert_match version.to_s, shell_output("#{bin}/dv --version")
    assert_match "login", shell_output("#{bin}/dv help")
    assert_match "complete", shell_output("#{bin}/dv completion bash")
  end
end

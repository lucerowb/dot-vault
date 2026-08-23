class DotVault < Formula
  desc "CLI for DotVault — secure environment variable management"
  homepage "https://github.com/lucerowb/dot-vault/tree/main/packages/cli"
  url "https://github.com/lucerowb/dot-vault/releases/download/v0.2.12/dotvault-cli-0.2.12.npm.tgz"
  version "0.2.12"
  sha256 "ac18b4c781e2b407b2acb588b10088c9f93dda9515adfc7d806b68812b191260"
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

class DotVault < Formula
  desc "CLI for DotVault — secure environment variable management"
  homepage "https://github.com/lucerowb/dot-vault/tree/main/packages/cli"
  url "https://github.com/lucerowb/dot-vault/releases/download/v0.2.8/dotvault-cli-0.2.8.npm.tgz"
  version "0.2.8"
  sha256 "ceedbe46d1cd0b05ada363f02d1c6c4278b9439cddb84deeab6679ed99fef80d"
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
    assert_match version.to_s, shell_output("#{bin}/dv --version")
  end
end

import os

def read_gitignore():
    gitignore_files = set()
    try:
        with open(".gitignore", "r", encoding="utf-8") as gitignore:
            for line in gitignore:
                line = line.strip()
                if line and not line.startswith("#"):
                    gitignore_files.add(line)
    except FileNotFoundError:
        pass
    return gitignore_files

def should_exclude(path, excluded_patterns):
    abs_path = os.path.abspath(path)
    for pattern in excluded_patterns:
        abs_pattern = os.path.abspath(pattern)
        if os.path.commonpath([abs_path, abs_pattern]) == abs_pattern or abs_path.endswith(abs_pattern):
            return True
    return False

def get_unique_output_filename(base_name):
    for i in range(1000):
        if i == 0:
            filename = base_name
        else:
            filename = f"{os.path.splitext(base_name)[0]}-{i}{os.path.splitext(base_name)[1]}"
        if not os.path.exists(filename):
            return filename
    print("Max output file limit reached! Overwrote output-1.rtf")
    return f"{os.path.splitext(base_name)[0]}-1{os.path.splitext(base_name)[1]}"

def scan_and_write_to_rtf(output_file):
    excluded_files = {"package-lock.json", "README.md", ".gitignore"}
    excluded_dirs = {"node_modules", ".git"}

    # Include patterns from .gitignore
    gitignore_patterns = read_gitignore()

    scanned_files = []

    output_file = get_unique_output_filename(output_file)

    with open(output_file, "w", encoding="utf-8") as rtf_file:
        for root, dirs, files in os.walk(os.getcwd()):
            # Exclude directories from .gitignore and predefined excluded_dirs
            dirs[:] = [d for d in dirs if d not in excluded_dirs and not should_exclude(os.path.join(root, d), gitignore_patterns)]

            for file in files:
                if file in excluded_files or should_exclude(os.path.join(root, file), gitignore_patterns):
                    continue

                # Exclude output files that match the pattern "output*.rtf"
                if file.startswith("output") and file.endswith(".rtf"):
                    continue

                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, os.getcwd())

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        contents = f.read()

                    # Write to the .rtf file in the specified format
                    rtf_file.write(f"// Contents of \"{relative_path}\"\n")
                    rtf_file.write(contents)
                    rtf_file.write("\n\n")

                    # Add to scanned files list
                    scanned_files.append(relative_path)
                except (UnicodeDecodeError, PermissionError) as e:
                    print(f"Skipping file {relative_path} due to error: {e}")

    # Print scanned files to console
    for scanned_file in scanned_files:
        print(f"Scanned and added: {scanned_file}")

    # Print summary
    print(f"Scanned and added {len(scanned_files)} files to {output_file}.")

if __name__ == "__main__":
    output_filename = "output.rtf"
    scan_and_write_to_rtf(output_filename)
    print(f"All contents written to {output_filename}.")

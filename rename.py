import os

count = 0
dirs_to_search = [
    'c:/Users/sayan/OneDrive/Desktop/instagram/Insta/frontend/src',
    'c:/Users/sayan/OneDrive/Desktop/instagram/Insta/backend'
]

for d in dirs_to_search:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js') or file.endswith('.html') or file.endswith('.css'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content.replace('Instagram', 'Bloom')
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        count += 1
                        print(f'Updated {file}')
                except Exception as e:
                    pass

print(f'Total files updated: {count}')

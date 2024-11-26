# Supabase Extractor

A tool to extract and manage Supabase database policies, functions, and triggers.

## Features

- Extract database policies, functions, and triggers from Supabase projects
- Configurable schema exclusions for functions and triggers
- Export extracted data as SQL scripts
- Option to include DROP POLICY statements
- User-friendly error handling and setup instructions

## Getting Started

1. Clone the repository
```
git clone https://github.com/adelelawady/supabase-extractor.git
cd supabase-extractor
```

2. Install dependencies

```
npm install
```


3. Run the development server

```
npm run dev
```

## Usage

1. **Initial Setup**
   - Run the setup SQL in your Supabase SQL editor
   - Configure excluded schemas for functions and triggers
   - Run the setup SQL using the UI

2. **Extract Database Objects**
   - Enter your Supabase project URL
   - Enter your service role API key
   - Click "Extract Data"

3. **Export Data**
   - View extracted policies, functions, and triggers
   - Toggle "Include DROP POLICY statements" if needed
   - Click "Export SQL" to download the SQL script

4. **Cleanup (Important)**
   After extracting your data, it's recommended to remove the setup functions for security. Run this SQL in your Supabase SQL editor:
   ```sql
   -- Remove setup functions
   DROP FUNCTION IF EXISTS public.exec_sql(text);
   DROP FUNCTION IF EXISTS public.get_policies();
   DROP FUNCTION IF EXISTS public.get_functions();
   DROP FUNCTION IF EXISTS public.get_triggers();
   ```

## Configuration

### Function Schemas
By default, the following schemas are excluded from function extraction:
- pg_catalog
- information_schema
- extensions
- pgsodium
- storage
- realtime
- vault

### Trigger Schemas
By default, the following schemas are excluded from trigger extraction:
- pgsodium
- storage
- realtime
- vault

You can modify these exclusions through the UI's Setup Configuration section.

## Security

- No credentials are stored
- All operations are performed client-side
- Database connections use Supabase's secure API
- Remember to remove setup functions after use

## Error Handling

The tool provides detailed error messages for common issues:
- Missing setup functions
- Invalid credentials
- Permission issues
- Connection timeouts
- Invalid data structures

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

For more detailed information, see:
- [Privacy Policy](PRIVACY.md)
- [Terms and Conditions](TERMS.md)
- [License](LICENSE)

## Author

Created by [Adel Elawady](https://github.com/adelelawady)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Open an [issue](https://github.com/adelelawady/supabase-extractor/issues)
- Contact via [GitHub](https://github.com/adelelawady)

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database access via [Supabase](https://supabase.com/)